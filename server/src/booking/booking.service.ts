import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Booking,
  BookingStatus,
  ItemStatus,
  ResourceType,
} from '../../generated/prisma/client.js';
import {
  DURATION_CAP_MS,
  HIGH_TIER_DEVICE_MIN,
  TIER_LIMITS,
} from '../common/domain.constants.js';
import { PointsService } from '../points/points.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { SystemConfigService } from '../config/system-config.service.js';
import { AuditService } from '../audit/audit.service.js';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export type BookingListParams = {
  page: number;
  limit: number;
  userId?: string;
  resourceType?: ResourceType;
  status?: BookingStatus;
};

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private waitlist: WaitlistService,
    private points: PointsService,
    private systemConfig: SystemConfigService,
    private audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const {
      resourceType,
      resourceId,
      startAt: startStr,
      endAt: endStr,
      message,
    } = dto;
    const startAt = new Date(startStr);
    const endAt = new Date(endStr);

    // (1) duration window + cap
    const durationMs = endAt.getTime() - startAt.getTime();
    if (durationMs <= 0)
      throw new BadRequestException('endAt must be after startAt');
    if (durationMs > DURATION_CAP_MS[resourceType]) {
      throw new BadRequestException(`Exceeds the ${resourceType} duration cap`);
    }

    // (2) per-tier concurrency check - Admin/Staff have tier = null and bypass this
    if (user.tier != null) {
      const config = await this.systemConfig.get();
      const tierInfo = config.tiers[user.tier - 1]; // tier is 1-indexed
      // Map ResourceType to config field names (BOOK -> books, DEVICE -> devices, ROOM -> rooms)
      const fieldMap: Record<ResourceType, string> = {
        BOOK: 'books',
        DEVICE: 'devices',
        ROOM: 'rooms',
      };
      const fieldName = fieldMap[resourceType];
      const limit =
        (tierInfo?.[fieldName as keyof typeof tierInfo] as
          | number
          | undefined) ?? TIER_LIMITS[user.tier]?.[resourceType];

      const active = await this.prisma.booking.count({
        where: {
          userId,
          resourceType,
          status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
        },
      });

      if (limit && active >= limit) {
        throw new BadRequestException(
          `Tier ${user.tier} limit reached for ${resourceType}`,
        );
      }
    }

    // (3) route to booking status
    const status = await this.route(resourceType, resourceId, startAt, endAt);

    // (4) persist booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        resourceType,
        bookTitleId: resourceType === ResourceType.BOOK ? resourceId : null,
        deviceId: resourceType === ResourceType.DEVICE ? resourceId : null,
        studyRoomId: resourceType === ResourceType.ROOM ? resourceId : null,
        startAt,
        endAt,
        message: message ?? null,
        status,
        qrToken: status === BookingStatus.APPROVED ? randomUUID() : null,
      },
    });

    // (5) enqueue if waitlisted
    if (status === BookingStatus.WAITLIST) {
      await this.waitlist.enqueue(booking, user, resourceId, !!message);
    }

    let resourceName = '';
    if (resourceType === ResourceType.BOOK) {
      const book = await this.prisma.bookTitle.findUnique({
        where: { id: resourceId },
      });
      resourceName = book?.title ?? '';
    } else if (resourceType === ResourceType.DEVICE) {
      const device = await this.prisma.device.findUnique({
        where: { id: resourceId },
      });
      resourceName = device?.name ?? '';
    } else if (resourceType === ResourceType.ROOM) {
      const room = await this.prisma.studyRoom.findUnique({
        where: { id: resourceId },
      });
      resourceName = room?.name ?? '';
    }

    await this.audit.log(userId, 'BOOKING_CREATED', 'Booking', booking.id, {
      userName: user.name,
      userEmail: user.email,
      resourceType,
      resourceName,
    });

    return booking;
  }

  private async route(
    type: ResourceType,
    resourceId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<BookingStatus> {
    if (type === ResourceType.BOOK) {
      const free = await this.prisma.bookCopy.count({
        where: { bookTitleId: resourceId, status: ItemStatus.AVAILABLE },
      });
      return free >= 1 ? BookingStatus.APPROVED : BookingStatus.WAITLIST;
    }

    if (type === ResourceType.DEVICE) {
      const device = await this.prisma.device.findUnique({
        where: { id: resourceId },
      });
      if (!device) throw new NotFoundException('Device not found');
      if (device.status !== ItemStatus.AVAILABLE) return BookingStatus.WAITLIST;
      // High-tier devices (tier ≥ 4) require manual staff approval
      return device.deviceTier >= HIGH_TIER_DEVICE_MIN
        ? BookingStatus.PENDING
        : BookingStatus.APPROVED;
    }

    // ROOM: no time overlap against existing APPROVED/PENDING bookings
    const clash = await this.prisma.booking.findFirst({
      where: {
        studyRoomId: resourceId,
        status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    return clash ? BookingStatus.WAITLIST : BookingStatus.APPROVED;
  }

  async approve(bookingId: string, actorId?: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be approved');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.APPROVED, qrToken: randomUUID() },
      include: {
        user: { select: { name: true, email: true } },
        bookTitle: { select: { title: true } },
        device: { select: { name: true } },
        studyRoom: { select: { name: true } },
      },
    });

    const resourceName =
      updated.bookTitle?.title ??
      updated.device?.name ??
      updated.studyRoom?.name ??
      '';

    await this.audit.log(
      actorId ?? null,
      'BOOKING_APPROVED',
      'Booking',
      updated.id,
      {
        userName: updated.user.name,
        userEmail: updated.user.email,
        resourceType: updated.resourceType,
        resourceName,
      },
    );

    return updated;
  }

  async reject(bookingId: string, actorId?: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be rejected');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.REJECTED },
      include: {
        user: { select: { name: true, email: true } },
        bookTitle: { select: { title: true } },
        device: { select: { name: true } },
        studyRoom: { select: { name: true } },
      },
    });

    const resourceName =
      updated.bookTitle?.title ??
      updated.device?.name ??
      updated.studyRoom?.name ??
      '';

    await this.audit.log(
      actorId ?? null,
      'BOOKING_REJECTED',
      'Booking',
      updated.id,
      {
        userName: updated.user.name,
        userEmail: updated.user.email,
        resourceType: updated.resourceType,
        resourceName,
      },
    );

    return updated;
  }

  async cancel(
    actorId: string,
    bookingId: string,
    adminOverride = false,
  ): Promise<Booking> {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { waitlistEntry: true },
    });

    if (!adminOverride && booking.userId !== actorId) {
      throw new ForbiddenException("Cannot cancel another user's booking");
    }

    const cancellable: BookingStatus[] = [
      BookingStatus.APPROVED,
      BookingStatus.PENDING,
      BookingStatus.WAITLIST,
    ];
    if (!cancellable.includes(booking.status)) {
      throw new BadRequestException(
        `Booking in status ${booking.status} cannot be cancelled`,
      );
    }

    // Dismiss waitlist entry if booking is queued
    if (booking.waitlistEntry && booking.status === BookingStatus.WAITLIST) {
      await this.waitlist.dismiss(booking.waitlistEntry.id);
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      include: {
        user: { select: { name: true, email: true } },
        bookTitle: { select: { title: true } },
        device: { select: { name: true } },
        studyRoom: { select: { name: true } },
      },
    });

    // If slot was live (APPROVED), apply cancellation charges and free the slot
    if (booking.status === BookingStatus.APPROVED) {
      await this.applyCancelPoints(booking);
      const resourceKey = (booking.bookTitleId ??
        booking.deviceId ??
        booking.studyRoomId)!;
      await this.waitlist.onResourceFreed(booking.resourceType, resourceKey);
    }

    const resourceName =
      updated.bookTitle?.title ??
      updated.device?.name ??
      updated.studyRoom?.name ??
      '';

    await this.audit.log(actorId, 'BOOKING_CANCELLED', 'Booking', updated.id, {
      userName: updated.user.name,
      userEmail: updated.user.email,
      resourceType: updated.resourceType,
      resourceName,
      adminOverride,
    });

    return updated;
  }

  private async applyCancelPoints(booking: Booking): Promise<void> {
    const meta = { bookingId: booking.id };
    if (booking.resourceType === ResourceType.ROOM) {
      // Room: charge based on notice period
      const notice = booking.startAt.getTime() - Date.now();
      if (notice >= TWO_HOURS_MS) {
        await this.points.applyFixed(booking.userId, 'ROOM_CANCEL_EARLY', meta);
      } else {
        await this.points.applyFixed(booking.userId, 'ROOM_CANCEL_LATE', meta);
      }
    } else {
      // Book / Device: flat -25
      await this.points.applyFixed(booking.userId, 'BOOKING_CANCELLED', meta);
    }
  }

  findById(id: string): Promise<Booking | null> {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        bookTitle: { select: { title: true, imageUrl: true } },
        device: { select: { name: true, imageUrl: true } },
        studyRoom: { select: { name: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findMany(params: BookingListParams): Promise<[Booking[], number]> {
    const { page, limit, userId, resourceType, status } = params;
    const where = {
      ...(userId ? { userId } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(status ? { status } : {}),
    };
    return Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bookTitle: { select: { title: true, imageUrl: true } },
          device: { select: { name: true, imageUrl: true } },
          studyRoom: { select: { name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
  }

  async findMine(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: BookingStatus;
      resourceType?: ResourceType;
    },
  ): Promise<[Booking[], number]> {
    const { page, limit, status, resourceType } = params;
    const where = {
      userId,
      ...(status ? { status } : {}),
      ...(resourceType ? { resourceType } : {}),
    };
    return Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bookTitle: { select: { title: true, imageUrl: true } },
          device: { select: { name: true, imageUrl: true } },
          studyRoom: { select: { name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
  }
}
