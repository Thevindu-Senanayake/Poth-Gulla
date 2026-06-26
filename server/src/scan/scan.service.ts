import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import {
  Booking,
  BookingStatus,
  BorrowingStatus,
  ItemCondition,
  ItemStatus,
  ResourceType,
  AuditAction,
  AuditTargetType,
} from '../../generated/prisma/client.js';
import { PointsService } from '../points/points.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';
import { PointAction } from '../points/point-events.js';
import { AuditService } from '../audit/audit.service.js';
import {
  SystemConfigService,
  SystemConfigData,
} from '../config/system-config.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// ── DTOs ─────────────────────────────────────────────────────────────────────

export class CheckoutDto {
  @IsString() @IsNotEmpty() bookingQr!: string;
  @IsString() @IsNotEmpty() assetTag!: string;
}

export class RoomCheckinDto {
  @IsString() @IsNotEmpty() roomQr!: string;
}

export class ReturnItemDto {
  @IsString() @IsNotEmpty() assetTag!: string;
  @IsEnum(ItemCondition) condition!: ItemCondition;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ScanService {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private waitlist: WaitlistService,
    private audit: AuditService,
    private systemConfig: SystemConfigService,
  ) {}

  // ── Checkout (book or device) ─────────────────────────────────────────

  async checkout(dto: CheckoutDto, actorId?: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { qrToken: dto.bookingQr },
      include: {
        waitlistEntry: true,
        user: { select: { name: true, email: true } },
        bookTitle: { select: { title: true } },
        device: { select: { name: true } },
      },
    });

    if (!booking) {
      // Check if bookingQr is actually a User ID or Email for direct checkout
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ id: dto.bookingQr }, { email: dto.bookingQr }],
        },
      });

      if (!user) {
        throw new NotFoundException(
          'Invalid booking QR - no matching booking or user found',
        );
      }
      if (!user.isActive) {
        throw new BadRequestException('User account is disabled');
      }

      // Check if the assetTag belongs to a BOOK copy
      const copy = await this.prisma.bookCopy.findUnique({
        where: { assetTag: dto.assetTag },
        include: { bookTitle: { select: { title: true } } },
      });

      if (!copy) {
        throw new NotFoundException(
          `No book copy with asset tag ${dto.assetTag}`,
        );
      }
      if (copy.status !== ItemStatus.AVAILABLE) {
        throw new BadRequestException(`Copy is ${copy.status}, not AVAILABLE`);
      }

      // Create a direct checkout booking
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + 14 * DAY_MS); // default 14 days

      return this.prisma.$transaction(async (tx) => {
        const b = await tx.booking.create({
          data: {
            userId: user.id,
            resourceType: ResourceType.BOOK,
            bookTitleId: copy.bookTitleId,
            bookCopyId: copy.id,
            startAt,
            endAt,
            status: BookingStatus.CHECKED_OUT,
          },
        });
        await tx.bookCopy.update({
          where: { id: copy.id },
          data: { status: ItemStatus.BORROWED },
        });
        await tx.borrowing.create({
          data: {
            bookingId: b.id,
            userId: user.id,
            bookCopyId: copy.id,
            dueAt: endAt,
          },
        });

        await this.audit.log(
          actorId ?? null,
          AuditAction.ITEM_CHECKED_OUT,
          AuditTargetType.Booking,
          b.id,
          {
            userName: user.name,
            userEmail: user.email,
            resourceType: ResourceType.BOOK,
            resourceName: copy.bookTitle?.title ?? '',
            assetTag: dto.assetTag,
          },
        );

        return b;
      });
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(
        `Booking is ${booking.status}, not APPROVED`,
      );
    }

    if (booking.resourceType === ResourceType.BOOK)
      return this.checkoutBook(booking, dto.assetTag, actorId);
    if (booking.resourceType === ResourceType.DEVICE)
      return this.checkoutDevice(booking, dto.assetTag, actorId);
    throw new BadRequestException(
      'Room bookings are checked in via /scan/room-checkin',
    );
  }

  private async checkoutBook(
    booking: Booking & {
      waitlistEntry?: { id: string } | null;
      user?: { name: string; email: string } | null;
      bookTitle?: { title: string } | null;
    },
    assetTag: string,
    actorId?: string,
  ): Promise<Booking> {
    const copy = await this.prisma.bookCopy.findUnique({ where: { assetTag } });
    if (!copy)
      throw new NotFoundException(`No book copy with asset tag ${assetTag}`);
    if (copy.bookTitleId !== booking.bookTitleId) {
      throw new BadRequestException(
        'Asset tag belongs to a different book title',
      );
    }
    if (copy.status !== ItemStatus.AVAILABLE) {
      throw new BadRequestException(`Copy is ${copy.status}, not AVAILABLE`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: booking.id },
        // Checkout opens an active loan - the booking is CHECKED_OUT, not
        // COMPLETED. It's marked COMPLETED only when the item is returned.
        data: { status: BookingStatus.CHECKED_OUT, bookCopyId: copy.id },
      }),
      this.prisma.bookCopy.update({
        where: { id: copy.id },
        data: { status: ItemStatus.BORROWED },
      }),
      this.prisma.borrowing.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          bookCopyId: copy.id,
          dueAt: booking.endAt,
        },
      }),
    ]);

    if (booking.waitlistEntry) {
      await this.points.applyFixed(booking.userId, 'WAITLIST_FULFILLED', {
        bookingId: booking.id,
      });
    }

    await this.audit.log(
      actorId ?? null,
      AuditAction.ITEM_CHECKED_OUT,
      AuditTargetType.Booking,
      updated.id,
      {
        userName: booking.user?.name ?? '',
        userEmail: booking.user?.email ?? '',
        resourceType: ResourceType.BOOK,
        resourceName: booking.bookTitle?.title ?? '',
        assetTag,
      },
    );

    return updated;
  }

  private async checkoutDevice(
    booking: Booking & {
      waitlistEntry?: { id: string } | null;
      user?: { name: string; email: string } | null;
      device?: { name: string } | null;
    },
    assetTag: string,
    actorId?: string,
  ): Promise<Booking> {
    const device = await this.prisma.device.findUnique({ where: { assetTag } });
    if (!device)
      throw new NotFoundException(`No device with asset tag ${assetTag}`);
    if (device.id !== booking.deviceId) {
      throw new BadRequestException('Asset tag belongs to a different device');
    }
    if (device.status !== ItemStatus.AVAILABLE) {
      throw new BadRequestException(
        `Device is ${device.status}, not AVAILABLE`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: booking.id },
        // Active loan - CHECKED_OUT now, COMPLETED on return.
        data: { status: BookingStatus.CHECKED_OUT },
      }),
      this.prisma.device.update({
        where: { id: device.id },
        data: { status: ItemStatus.BORROWED },
      }),
      this.prisma.borrowing.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          deviceId: device.id,
          dueAt: booking.endAt,
        },
      }),
    ]);

    if (booking.waitlistEntry) {
      await this.points.applyFixed(booking.userId, 'WAITLIST_FULFILLED', {
        bookingId: booking.id,
      });
    }

    await this.audit.log(
      actorId ?? null,
      AuditAction.ITEM_CHECKED_OUT,
      AuditTargetType.Booking,
      updated.id,
      {
        userName: booking.user?.name ?? '',
        userEmail: booking.user?.email ?? '',
        resourceType: ResourceType.DEVICE,
        resourceName: booking.device?.name ?? '',
        assetTag,
      },
    );

    return updated;
  }

  // ── Room check-in ─────────────────────────────────────────────────────

  async roomCheckin(userId: string, dto: RoomCheckinDto): Promise<Booking> {
    // QR scanners frequently append a trailing newline/whitespace, and a door QR
    // may encode either the permanent `roomQr` string or the room's `id`. Accept
    // both (trimmed) so a check-in resolves to the same room regardless.
    const code = dto.roomQr.trim();
    const room = await this.prisma.studyRoom.findFirst({
      where: { OR: [{ roomQr: code }, { id: code }] },
    });
    if (!room)
      throw new NotFoundException('No study room matches this QR code');

    const now = new Date();
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        studyRoomId: room.id,
        status: BookingStatus.APPROVED,
        startAt: { lte: now },
        endAt: { gt: now },
      },
    });
    if (!booking) {
      throw new BadRequestException(
        'No active approved booking for this room right now',
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.COMPLETED },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    await this.points.applyFromConfig(userId, 'ROOM_ATTENDED', {
      bookingId: booking.id,
    });

    await this.audit.log(
      userId,
      AuditAction.ROOM_CHECKED_IN,
      AuditTargetType.Booking,
      updated.id,
      {
        userName: updated.user.name,
        userEmail: updated.user.email,
        resourceType: ResourceType.ROOM,
        resourceName: room.name,
      },
    );

    return updated;
  }

  // ── Return ────────────────────────────────────────────────────────────

  async returnItem(dto: ReturnItemDto, actorId?: string) {
    const config = await this.systemConfig.get();

    // Find an active borrowing by assetTag on either a book copy or device
    const borrowing = await this.prisma.borrowing.findFirst({
      where: {
        status: { in: [BorrowingStatus.ACTIVE, BorrowingStatus.OVERDUE] },
        OR: [
          { bookCopy: { assetTag: dto.assetTag } },
          { device: { assetTag: dto.assetTag } },
        ],
      },
      include: {
        bookCopy: { include: { bookTitle: { select: { title: true } } } },
        device: { select: { name: true } },
        booking: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!borrowing) {
      throw new NotFoundException(
        `No active borrowing for asset tag ${dto.assetTag}`,
      );
    }

    const returnedAt = new Date();
    const daysLate = Math.ceil(
      (returnedAt.getTime() - borrowing.dueAt.getTime()) / DAY_MS,
    );
    const isBook = borrowing.bookCopy != null;

    const { action, delta } = this.scoreReturn(
      isBook,
      daysLate,
      dto.condition,
      config,
    );

    // Persist return: update borrowing + free the item
    await this.prisma.$transaction([
      this.prisma.borrowing.update({
        where: { id: borrowing.id },
        data: {
          status: BorrowingStatus.RETURNED,
          returnedAt,
          condition: dto.condition,
        },
      }),
      borrowing.bookCopyId
        ? this.prisma.bookCopy.update({
            where: { id: borrowing.bookCopyId },
            data: { status: ItemStatus.AVAILABLE },
          })
        : this.prisma.device.update({
            where: { id: borrowing.deviceId! },
            data: { status: ItemStatus.AVAILABLE },
          }),
      // The loan is now closed - complete the originating booking.
      this.prisma.booking.update({
        where: { id: borrowing.bookingId },
        data: { status: BookingStatus.COMPLETED },
      }),
    ]);

    // Apply return points
    await this.points.apply(borrowing.userId, action, delta, {
      borrowingId: borrowing.id,
    });

    // Devices: damaged penalty is on top of timing result
    if (!isBook && dto.condition === ItemCondition.DAMAGED) {
      await this.points.applyFromConfig(borrowing.userId, 'DEVICE_DAMAGED', {
        borrowingId: borrowing.id,
      });
    }

    // Free the slot and auto-promote next waitlist entry
    const resourceType = isBook ? ResourceType.BOOK : ResourceType.DEVICE;
    const resourceKey = isBook
      ? borrowing.booking.bookTitleId!
      : borrowing.booking.deviceId!;
    await this.waitlist.onResourceFreed(resourceType, resourceKey);

    const resourceName =
      borrowing.bookCopy?.bookTitle?.title ?? borrowing.device?.name ?? '';

    await this.audit.log(
      actorId ?? null,
      AuditAction.ITEM_RETURNED,
      AuditTargetType.Booking,
      borrowing.bookingId,
      {
        userName: borrowing.user?.name ?? '',
        userEmail: borrowing.user?.email ?? '',
        resourceType,
        resourceName,
        assetTag: dto.assetTag,
        condition: dto.condition,
      },
    );

    return borrowing;
  }

  private scoreReturn(
    isBook: boolean,
    daysLate: number,
    condition: ItemCondition,
    config: SystemConfigData,
  ): { action: PointAction; delta: number } {
    // Helper: read from config penalties by key, fall back to a hardcoded default
    const p = (key: string, fallback: number) =>
      config.penalties.find((r) => r.key === key)?.amount ?? fallback;

    if (isBook) {
      if (daysLate < -2)
        return {
          action: 'BOOK_RETURNED_EARLY',
          delta: p('BOOK_RETURNED_EARLY', 50),
        };
      if (daysLate <= 0)
        return {
          action: 'BOOK_RETURNED_ON_TIME',
          delta: p('BOOK_RETURNED_ON_TIME', 25),
        };
      if (daysLate === 1)
        return { action: 'BOOK_LATE_1D', delta: p('BOOK_LATE_1D', -10) };
      if (daysLate <= 7)
        return {
          action: 'BOOK_LATE_2_7D',
          delta: p('BOOK_LATE_PER_DAY', -20) * daysLate,
        };
      return {
        action: 'BOOK_LATE_7D_PLUS',
        delta: p('BOOK_LATE_7D_PLUS', -220),
      };
    }
    // Device — positive rewards only apply for GOOD condition.
    // For early/on-time DAMAGED returns the timing delta is 0; DEVICE_DAMAGED is charged separately.
    if (daysLate < 0)
      return condition === ItemCondition.GOOD
        ? {
            action: 'DEVICE_RETURNED_EARLY',
            delta: p('DEVICE_RETURNED_EARLY', 40),
          }
        : { action: 'DEVICE_RETURNED_EARLY', delta: 0 };
    if (daysLate <= 0)
      return condition === ItemCondition.GOOD
        ? {
            action: 'DEVICE_RETURNED_ON_TIME',
            delta: p('DEVICE_RETURNED_ON_TIME', 30),
          }
        : { action: 'DEVICE_RETURNED_ON_TIME', delta: 0 };
    if (daysLate <= 3)
      return { action: 'DEVICE_LATE_1_3D', delta: p('DEVICE_LATE_1_3D', -80) };
    return {
      action: 'DEVICE_LATE_3D_PLUS',
      delta: p('DEVICE_LATE_3D_PLUS', -160),
    };
  }
}
