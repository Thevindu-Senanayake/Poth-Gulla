import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Booking,
  BookingStatus,
  ItemStatus,
  ResourceType,
  Role,
  WaitlistEntry,
  WaitlistStatus,
  AuditAction,
  AuditTargetType,
} from '../../generated/prisma/client.js';
import { ROLE_WEIGHT } from '../common/domain.constants.js';
import { NotificationService } from '../notification/notification.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class WaitlistService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notif: NotificationService,
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
      AuditAction.WAITLIST_ENQUEUED,
      AuditTargetType.WaitlistEntry,
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
   * Ordered queue for a resource, sorted by priorityScore only.
   * Each entry carries a computed `needsReview` flag:
   *   true  = hasMessage && not rank-#1 && queue has >1 entry
   *   false = everything else (auto-promote eligible)
   * The #1 ranked entry is always in the auto-queue regardless of its message.
   */
  async queue(
    resourceType: ResourceType,
    resourceKey: string,
  ): Promise<WaitlistEntry[]> {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: { resourceType, resourceKey, status: WaitlistStatus.PENDING },
      orderBy: [{ priorityScore: 'desc' }],
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                tier: true,
              },
            },
            bookTitle: { select: { title: true } },
            device: { select: { name: true } },
            studyRoom: { select: { name: true } },
          },
        },
      },
    });

    const total = entries.length;
    return entries.map((e, index) => ({
      ...e,
      needsReview: e.hasMessage && index > 0 && total > 1,
    }));
  }

  /**
   * Called when an APPROVED booking is freed.
   * Auto-promotes the highest-priority entry regardless of hasMessage because
   * rank-#1 is always in the auto-queue by the new flagging rules.
   */
  async onResourceFreed(
    resourceType: ResourceType,
    resourceKey: string,
  ): Promise<void> {
    const next = await this.prisma.waitlistEntry.findFirst({
      where: { resourceType, resourceKey, status: WaitlistStatus.PENDING },
      orderBy: { priorityScore: 'desc' },
    });
    if (next) await this.promote(next.id);
  }

  /**
   * Decline a justification message without removing the user from the queue.
   * Clears hasMessage so the entry joins the auto-queue at its natural priority.
   */
  async declineMessage(
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

    const updated = await this.prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { hasMessage: false, staffNotes },
    });

    const resourceName =
      entry.booking.bookTitle?.title ??
      entry.booking.device?.name ??
      entry.booking.studyRoom?.name ??
      '';

    await this.audit.log(
      actorId ?? null,
      AuditAction.WAITLIST_DISMISSED,
      AuditTargetType.WaitlistEntry,
      entry.id,
      {
        userName: entry.booking.user.name,
        userEmail: entry.booking.user.email,
        resourceType: entry.resourceType,
        resourceName,
        messageDeclined: true,
        staffNotes,
      },
    );

    this.notif
      .create(
        entry.booking.userId ?? '',
        'WAITLIST_MESSAGE_DECLINED',
        `Your justification for "${resourceName}" was reviewed but not accepted. You remain in the queue at your priority position.`,
      )
      .catch(() => {});

    return updated;
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

    // For book/device promotions: set qrToken = physical asset tag for consistency.
    let bookCopyId: string | null = null;
    let qrToken: string = randomUUID();

    if (
      entry.booking.resourceType === ResourceType.DEVICE &&
      entry.booking.deviceId
    ) {
      const device = await this.prisma.device.findUnique({
        where: { id: entry.booking.deviceId },
        select: { assetTag: true },
      });
      if (device) qrToken = device.assetTag;
    } else if (
      entry.booking.resourceType === ResourceType.BOOK &&
      entry.booking.bookTitleId
    ) {
      const reserved = await this.prisma.$transaction(async (tx) => {
        const candidate = await tx.bookCopy.findFirst({
          where: {
            bookTitleId: entry.booking.bookTitleId!,
            status: ItemStatus.AVAILABLE,
          },
          orderBy: { assetTag: 'asc' },
        });
        if (!candidate) return null;
        const { count } = await tx.bookCopy.updateMany({
          where: { id: candidate.id, status: ItemStatus.AVAILABLE },
          data: { status: ItemStatus.RESERVED },
        });
        return count > 0 ? candidate : null;
      });
      if (reserved) {
        bookCopyId = reserved.id;
        qrToken = reserved.assetTag;
      }
    }

    const [updated] = await Promise.all([
      this.prisma.waitlistEntry.update({
        where: { id: entryId },
        data: { status: WaitlistStatus.PROMOTED, staffNotes },
      }),
      this.prisma.booking.update({
        where: { id: entry.bookingId },
        data: {
          status: BookingStatus.APPROVED,
          qrToken,
          ...(bookCopyId ? { bookCopyId } : {}),
        },
      }),
    ]);

    const resourceName =
      entry.booking.bookTitle?.title ??
      entry.booking.device?.name ??
      entry.booking.studyRoom?.name ??
      '';

    await this.audit.log(
      actorId ?? null,
      AuditAction.WAITLIST_PROMOTED,
      AuditTargetType.WaitlistEntry,
      entry.id,
      {
        userName: entry.booking.user.name,
        userEmail: entry.booking.user.email,
        resourceType: entry.resourceType,
        resourceName,
        staffNotes,
      },
    );

    this.notif
      .create(
        entry.booking.userId ?? '',
        'WAITLIST_PROMOTED',
        `You've been promoted from the waitlist for "${resourceName}" - your booking is now approved`,
      )
      .catch(() => {});

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
      AuditAction.WAITLIST_DISMISSED,
      AuditTargetType.WaitlistEntry,
      entry.id,
      {
        userName: entry.booking.user.name,
        userEmail: entry.booking.user.email,
        resourceType: entry.resourceType,
        resourceName,
        staffNotes,
      },
    );

    this.notif
      .create(
        entry.booking.userId ?? '',
        'WAITLIST_DISMISSED',
        `Your waitlist entry for "${resourceName}" was dismissed by staff`,
      )
      .catch(() => {});

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
