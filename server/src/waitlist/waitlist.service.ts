import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Booking,
  BookingStatus,
  ResourceType,
  Role,
  WaitlistEntry,
  WaitlistStatus,
} from '../../generated/prisma/client.js';
import { ROLE_WEIGHT } from '../common/domain.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class WaitlistService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** priority_score = tier * 0.6 + role_weight * 0.4 */
  score(tier: number, role: Role): number {
    return tier * 0.6 + (ROLE_WEIGHT[role] ?? 0) * 0.4;
  }

  async enqueue(
    booking: Booking,
    user: { tier: number | null; role: Role; name?: string; email?: string },
    resourceKey: string,
    hasMessage: boolean,
  ): Promise<WaitlistEntry> {
    const tier = user.tier ?? 3;
    const priorityScore = this.score(tier, user.role);
    const entry = await this.prisma.waitlistEntry.create({
      data: {
        bookingId: booking.id,
        resourceType: booking.resourceType,
        resourceKey,
        priorityScore,
        hasMessage,
      },
    });

    let resourceName = '';
    if (booking.resourceType === ResourceType.BOOK) {
      const book = await this.prisma.bookTitle.findUnique({
        where: { id: resourceKey },
      });
      resourceName = book?.title ?? '';
    } else if (booking.resourceType === ResourceType.DEVICE) {
      const device = await this.prisma.device.findUnique({
        where: { id: resourceKey },
      });
      resourceName = device?.name ?? '';
    } else if (booking.resourceType === ResourceType.ROOM) {
      const room = await this.prisma.studyRoom.findUnique({
        where: { id: resourceKey },
      });
      resourceName = room?.name ?? '';
    }

    let userName = user.name ?? '';
    let userEmail = user.email ?? '';
    if (!userName || !userEmail) {
      const u = await this.prisma.user.findUnique({
        where: { id: booking.userId },
      });
      userName = u?.name ?? '';
      userEmail = u?.email ?? '';
    }

    await this.audit.log(
      booking.userId,
      'WAITLIST_ENQUEUED',
      'Waitlist',
      entry.id,
      {
        userName,
        userEmail,
        resourceType: booking.resourceType,
        resourceName,
        priorityScore,
        hasMessage,
      },
    );

    return entry;
  }

  /**
   * Ordered queue for a resource.
   * hasMessage=true entries float to top (staff must review);
   * within each group, higher priorityScore wins.
   */
  async queue(
    resourceType: ResourceType,
    resourceKey: string,
  ): Promise<WaitlistEntry[]> {
    return this.prisma.waitlistEntry.findMany({
      where: { resourceType, resourceKey, status: WaitlistStatus.PENDING },
      orderBy: [{ hasMessage: 'desc' }, { priorityScore: 'desc' }],
    });
  }

  /**
   * Called when an APPROVED booking is freed.
   * Auto-promotes the highest-score message-free entry.
   * Messaged entries require explicit staff promotion.
   */
  async onResourceFreed(
    resourceType: ResourceType,
    resourceKey: string,
  ): Promise<void> {
    const next = await this.prisma.waitlistEntry.findFirst({
      where: {
        resourceType,
        resourceKey,
        status: WaitlistStatus.PENDING,
        hasMessage: false,
      },
      orderBy: { priorityScore: 'desc' },
    });
    if (next) await this.promote(next.id);
  }

  async promote(
    entryId: string,
    staffNotes?: string,
    actorId?: string,
  ): Promise<WaitlistEntry> {
    const entry = await this.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: entryId },
      include: {
        booking: {
          include: {
            user: { select: { name: true, email: true } },
            bookTitle: { select: { title: true } },
            device: { select: { name: true } },
            studyRoom: { select: { name: true } },
          },
        },
      },
    });
    if (entry.status !== WaitlistStatus.PENDING) {
      throw new BadRequestException(`Entry is already ${entry.status}`);
    }
    const [updated] = await Promise.all([
      this.prisma.waitlistEntry.update({
        where: { id: entryId },
        data: { status: WaitlistStatus.PROMOTED, staffNotes },
      }),
      this.prisma.booking.update({
        where: { id: entry.bookingId },
        data: { status: BookingStatus.APPROVED, qrToken: randomUUID() },
      }),
    ]);

    const resourceName =
      entry.booking.bookTitle?.title ??
      entry.booking.device?.name ??
      entry.booking.studyRoom?.name ??
      '';

    await this.audit.log(
      actorId ?? null,
      'WAITLIST_PROMOTED',
      'Waitlist',
      entry.id,
      {
        userName: entry.booking.user.name,
        userEmail: entry.booking.user.email,
        resourceType: entry.resourceType,
        resourceName,
        staffNotes,
      },
    );

    return updated;
  }

  async dismiss(
    entryId: string,
    staffNotes?: string,
    actorId?: string,
  ): Promise<WaitlistEntry> {
    const entry = await this.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: entryId },
      include: {
        booking: {
          include: {
            user: { select: { name: true, email: true } },
            bookTitle: { select: { title: true } },
            device: { select: { name: true } },
            studyRoom: { select: { name: true } },
          },
        },
      },
    });
    const updated = await this.prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: WaitlistStatus.DISMISSED, staffNotes },
    });

    const resourceName =
      entry.booking.bookTitle?.title ??
      entry.booking.device?.name ??
      entry.booking.studyRoom?.name ??
      '';

    await this.audit.log(
      actorId ?? null,
      'WAITLIST_DISMISSED',
      'Waitlist',
      entry.id,
      {
        userName: entry.booking.user.name,
        userEmail: entry.booking.user.email,
        resourceType: entry.resourceType,
        resourceName,
        staffNotes,
      },
    );

    return updated;
  }

  async myEntries(userId: string) {
    return this.prisma.waitlistEntry.findMany({
      where: { booking: { userId }, status: WaitlistStatus.PENDING },
      include: { booking: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async positionFor(bookingId: string): Promise<number | null> {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { bookingId },
    });
    if (!entry || entry.status !== WaitlistStatus.PENDING) return null;
    const all = await this.queue(entry.resourceType, entry.resourceKey);
    const idx = all.findIndex((e) => e.id === entry.id);
    return idx === -1 ? null : idx + 1;
  }
}
