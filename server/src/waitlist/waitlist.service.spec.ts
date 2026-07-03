/* eslint-disable */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { WaitlistService } from './waitlist.service.js';
import { ROLE_WEIGHT } from '../common/domain.constants.js';

// Entry factory: PENDING waitlist entry with a fully-included booking.
function entry(overrides: any = {}) {
  return {
    id: 'w1',
    bookingId: 'b1',
    resourceType: 'BOOK',
    resourceKey: 'title-1',
    priorityScore: 2.0,
    hasMessage: false,
    status: 'PENDING',
    booking: {
      id: 'b1',
      userId: 'u1',
      resourceType: 'BOOK',
      bookTitleId: 'title-1',
      deviceId: null,
      user: { name: 'Alice', email: 'alice@iit.ac.lk' },
      bookTitle: { title: 'Clean Code' },
      device: null,
      studyRoom: null,
    },
    ...overrides,
  };
}

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prisma: any;
  let audit: { log: jest.Mock };
  let notif: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      waitlistEntry: {
        findMany: jest.fn(async () => []),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(async ({ data }: any) => ({ id: 'w1', ...data })),
        create: jest.fn(),
      },
      booking: {
        update: jest.fn(async ({ data }: any) => ({ id: 'b1', ...data })),
      },
      bookCopy: {
        count: jest.fn(async () => 1),
        findFirst: jest.fn(async () => null),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      device: { findUnique: jest.fn(async () => null) },
      $transaction: jest.fn(async (arg: any) =>
        typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
      ),
    };
    audit = { log: jest.fn() };
    notif = { create: jest.fn(async () => ({})) as any };
    service = new WaitlistService(prisma as any, audit as any, notif as any);
  });

  describe('score', () => {
    it('weights tier at 0.6 and role at 0.4', () => {
      expect(service.score(3, 'STUDENT' as any)).toBeCloseTo(
        3 * 0.6 + (ROLE_WEIGHT['STUDENT'] ?? 0) * 0.4,
      );
      // A lecturer outranks a student at the same tier.
      expect(service.score(3, 'LECTURER' as any)).toBeGreaterThan(
        service.score(3, 'STUDENT' as any),
      );
    });
  });

  describe('queue (needsReview computation)', () => {
    it('flags only messaged entries ranked below #1', async () => {
      prisma.waitlistEntry.findMany.mockResolvedValue([
        entry({ id: 'top', priorityScore: 4, hasMessage: true }),
        entry({ id: 'mid', priorityScore: 3, hasMessage: true }),
        entry({ id: 'low', priorityScore: 2, hasMessage: false }),
      ]);
      const q: any[] = await service.queue('BOOK' as any, 'title-1');
      expect(q.map((e) => e.needsReview)).toEqual([false, true, false]);
    });

    it('a single messaged entry never needs review', async () => {
      prisma.waitlistEntry.findMany.mockResolvedValue([
        entry({ id: 'only', hasMessage: true }),
      ]);
      const q: any[] = await service.queue('BOOK' as any, 'title-1');
      expect(q[0].needsReview).toBe(false);
    });
  });

  describe('onResourceFreed', () => {
    it('holds promotion while a below-#1 messaged entry is pending review', async () => {
      const spy = jest.spyOn(service, 'promote').mockResolvedValue({} as any);
      prisma.waitlistEntry.findMany.mockResolvedValue([
        entry({ id: 'top', priorityScore: 4 }),
        entry({ id: 'flagged', priorityScore: 3, hasMessage: true }),
      ]);
      await service.onResourceFreed('BOOK' as any, 'title-1');
      expect(spy).not.toHaveBeenCalled();
    });

    it('promotes the top entry when the only message belongs to rank #1', async () => {
      const spy = jest.spyOn(service, 'promote').mockResolvedValue({} as any);
      prisma.waitlistEntry.findMany.mockResolvedValue([
        entry({ id: 'top', priorityScore: 4, hasMessage: true }),
        entry({ id: 'second', priorityScore: 3, hasMessage: false }),
      ]);
      prisma.bookCopy.count.mockResolvedValue(1);
      await service.onResourceFreed('BOOK' as any, 'title-1');
      expect(spy).toHaveBeenCalledWith('top');
    });

    it('does not promote a BOOK when no copy is AVAILABLE', async () => {
      const spy = jest.spyOn(service, 'promote').mockResolvedValue({} as any);
      prisma.waitlistEntry.findMany.mockResolvedValue([entry({ id: 'top' })]);
      prisma.bookCopy.count.mockResolvedValue(0);
      await service.onResourceFreed('BOOK' as any, 'title-1');
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not promote a DEVICE that is not AVAILABLE', async () => {
      const spy = jest.spyOn(service, 'promote').mockResolvedValue({} as any);
      prisma.waitlistEntry.findMany.mockResolvedValue([
        entry({ id: 'top', resourceType: 'DEVICE', resourceKey: 'dev-1' }),
      ]);
      prisma.device.findUnique.mockResolvedValue({ status: 'BORROWED' });
      await service.onResourceFreed('DEVICE' as any, 'dev-1');
      expect(spy).not.toHaveBeenCalled();
    });

    it('is a no-op on an empty queue', async () => {
      const spy = jest.spyOn(service, 'promote').mockResolvedValue({} as any);
      prisma.waitlistEntry.findMany.mockResolvedValue([]);
      await service.onResourceFreed('BOOK' as any, 'title-1');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('declineMessage', () => {
    it('clears hasMessage, keeps the entry PENDING, and retries promotion', async () => {
      const freed = jest
        .spyOn(service, 'onResourceFreed')
        .mockResolvedValue(undefined);
      prisma.waitlistEntry.findUniqueOrThrow.mockResolvedValue(
        entry({ hasMessage: true }),
      );
      await service.declineMessage('w1', 'not justified', 'staff-1');

      expect(prisma.waitlistEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'w1' },
          data: { hasMessage: false, staffNotes: 'not justified' },
        }),
      );
      // Booking is untouched - the member keeps their place in the queue.
      expect(prisma.booking.update).not.toHaveBeenCalled();
      expect(notif.create).toHaveBeenCalledWith(
        'u1',
        'WAITLIST_MESSAGE_DECLINED',
        expect.stringContaining('Clean Code'),
      );
      expect(freed).toHaveBeenCalledWith('BOOK', 'title-1');
    });

    it('rejects entries that are not PENDING', async () => {
      prisma.waitlistEntry.findUniqueOrThrow.mockResolvedValue(
        entry({ status: 'DISMISSED' }),
      );
      await expect(service.declineMessage('w1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('dismiss', () => {
    it('dismisses the entry, cancels the booking, and retries promotion', async () => {
      const freed = jest
        .spyOn(service, 'onResourceFreed')
        .mockResolvedValue(undefined);
      prisma.waitlistEntry.findUniqueOrThrow.mockResolvedValue(entry());
      await service.dismiss('w1', undefined, 'staff-1');

      expect(prisma.waitlistEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DISMISSED' }),
        }),
      );
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b1' },
          data: { status: 'CANCELLED' },
        }),
      );
      expect(freed).toHaveBeenCalledWith('BOOK', 'title-1');
    });
  });

  describe('promote', () => {
    it('BOOK: reserves a copy and sets qrToken to its asset tag', async () => {
      prisma.waitlistEntry.findUniqueOrThrow.mockResolvedValue(entry());
      prisma.bookCopy.findFirst.mockResolvedValue({
        id: 'copy-1',
        assetTag: 'BK-CC-001',
      });
      prisma.bookCopy.updateMany.mockResolvedValue({ count: 1 });

      await service.promote('w1', undefined, 'staff-1');

      expect(prisma.bookCopy.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'RESERVED' },
        }),
      );
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            qrToken: 'BK-CC-001',
            bookCopyId: 'copy-1',
          }),
        }),
      );
    });

    it('DEVICE: sets qrToken to the device asset tag', async () => {
      prisma.waitlistEntry.findUniqueOrThrow.mockResolvedValue(
        entry({
          resourceType: 'DEVICE',
          resourceKey: 'dev-1',
          booking: {
            ...entry().booking,
            resourceType: 'DEVICE',
            bookTitleId: null,
            deviceId: 'dev-1',
            bookTitle: null,
            device: { name: 'MacBook Pro' },
          },
        }),
      );
      prisma.device.findUnique.mockResolvedValue({ assetTag: 'DEV-MBP-001' });

      await service.promote('w1');

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ qrToken: 'DEV-MBP-001' }),
        }),
      );
    });

    it('rejects entries that are not PENDING', async () => {
      prisma.waitlistEntry.findUniqueOrThrow.mockResolvedValue(
        entry({ status: 'PROMOTED' }),
      );
      await expect(service.promote('w1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('needsReviewCount', () => {
    it('counts flagged entries across resources using the same rules', async () => {
      prisma.waitlistEntry.findMany.mockResolvedValue([
        // Resource A: top has message (not counted), #2 has message (counted)
        {
          resourceType: 'BOOK',
          resourceKey: 'a',
          hasMessage: true,
          priorityScore: 4,
        },
        {
          resourceType: 'BOOK',
          resourceKey: 'a',
          hasMessage: true,
          priorityScore: 3,
        },
        // Resource B: single messaged entry (not counted)
        {
          resourceType: 'BOOK',
          resourceKey: 'b',
          hasMessage: true,
          priorityScore: 2,
        },
      ]);
      expect(await service.needsReviewCount()).toBe(1);
    });
  });
});
