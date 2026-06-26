import { Injectable, Logger } from '@nestjs/common';
import {
  BookingStatus,
  BorrowingStatus,
  ResourceType,
  Role,
} from '../../generated/prisma/client.js';
import { PointsService } from '../points/points.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SystemConfigService } from '../config/system-config.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OverdueService {
  private readonly logger = new Logger(OverdueService.name);

  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private systemConfig: SystemConfigService,
  ) {}

  async runSweep(): Promise<{
    borrowingsProcessed: number;
    noShowsProcessed: number;
  }> {
    const [borrowingsProcessed, noShowsProcessed] = await Promise.all([
      this.sweepBorrowings(),
      this.sweepRoomNoShows(),
    ]);
    this.logger.log(
      `Overdue sweep complete - borrowings: ${borrowingsProcessed}, no-shows: ${noShowsProcessed}`,
    );
    return { borrowingsProcessed, noShowsProcessed };
  }

  private async sweepBorrowings(): Promise<number> {
    const config = await this.systemConfig.get();
    const recallDays =
      config.penalties.find((p) => p.key === 'RECALL_DAYS')?.amount ?? 2;
    const escalateDays =
      config.penalties.find((p) => p.key === 'ESCALATE_DAYS')?.amount ?? 7;

    const now = new Date();
    const activeBorrowings = await this.prisma.borrowing.findMany({
      where: {
        status: { in: [BorrowingStatus.ACTIVE, BorrowingStatus.OVERDUE] },
        dueAt: { lt: now },
      },
      include: {
        bookCopy: { select: { assetTag: true } },
        device: { select: { assetTag: true, name: true } },
      },
    });

    let processed = 0;
    for (const b of activeBorrowings) {
      const daysLate = Math.ceil((now.getTime() - b.dueAt.getTime()) / DAY_MS);
      const itemLabel = b.bookCopy?.assetTag ?? b.device?.name ?? b.id;

      if (daysLate > escalateDays && b.status === BorrowingStatus.ACTIVE) {
        await this.prisma.borrowing.update({
          where: { id: b.id },
          data: { status: BorrowingStatus.OVERDUE },
        });
        await this.notifyUser(
          b.userId,
          'OVERDUE_7D_PLUS',
          `Your item (${itemLabel}) is ${daysLate} days overdue and has been marked OVERDUE. Please return it immediately.`,
        );
        await this.notifyRole(
          Role.ADMIN,
          'OVERDUE_ADMIN_ALERT',
          `Borrowing ${b.id} (${itemLabel}) is ${daysLate} days overdue and escalated to OVERDUE.`,
        );
      } else if (daysLate >= recallDays && !b.recallFlag) {
        await this.prisma.borrowing.update({
          where: { id: b.id },
          data: { recallFlag: true },
        });
        await this.notifyUser(
          b.userId,
          'OVERDUE_RECALL',
          `Your item (${itemLabel}) is ${daysLate} days overdue. Staff have been notified for recall.`,
        );
        await this.notifyRole(
          Role.LIBRARY_STAFF,
          'RECALL_FLAG',
          `Borrowing ${b.id} (${itemLabel}) is ${daysLate} days overdue. Recall flag set - please follow up with the borrower.`,
        );
      } else if (daysLate === 1) {
        await this.notifyUser(
          b.userId,
          'OVERDUE_REMINDER',
          `Your item (${itemLabel}) is 1 day overdue. Please return it as soon as possible to avoid penalties.`,
        );
      }
      processed++;
    }

    return processed;
  }

  private async sweepRoomNoShows(): Promise<number> {
    const config = await this.systemConfig.get();
    const noShowAmount = Math.abs(
      config.penalties.find((p) => p.key === 'ROOM_NO_SHOW')?.amount ?? 150,
    );

    const now = new Date();
    const missed = await this.prisma.booking.findMany({
      where: {
        resourceType: ResourceType.ROOM,
        status: BookingStatus.APPROVED,
        endAt: { lt: now },
      },
    });

    let processed = 0;
    for (const booking of missed) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });
      await this.points.applyFromConfig(booking.userId, 'ROOM_NO_SHOW', {
        bookingId: booking.id,
      });
      await this.notifyUser(
        booking.userId,
        'ROOM_NO_SHOW',
        `You did not check in for your room booking. A no-show penalty of ${noShowAmount} points has been applied.`,
      );
      processed++;
    }

    return processed;
  }

  private notifyUser(
    userId: string,
    type: string,
    message: string,
  ): Promise<unknown> {
    return this.prisma.notification.create({ data: { userId, type, message } });
  }

  private async notifyRole(
    role: Role,
    type: string,
    message: string,
  ): Promise<void> {
    const targets = await this.prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true },
    });
    if (targets.length === 0) return;
    await this.prisma.notification.createMany({
      data: targets.map((u) => ({ userId: u.id, type, message })),
    });
  }
}
