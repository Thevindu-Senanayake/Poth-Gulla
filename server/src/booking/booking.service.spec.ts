/* eslint-disable */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { BookingService } from './booking.service.js';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();

describe('BookingService.create (routing, limits, caps)', () => {
  let service: BookingService;
  let prisma: any;
  let waitlist: { enqueue: jest.Mock };
  let points: Record<string, jest.Mock>;
  let systemConfig: { get: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: { findUniqueOrThrow: jest.fn() },
      booking: {
        count: jest.fn(async () => 0), // under tier limit by default
        create: jest.fn(async ({ data }: any) => ({ id: 'b1', ...data })),
        findFirst: jest.fn(async () => null), // no room clash by default
      },
      bookCopy: {
        count: jest.fn(),
        findFirst: jest.fn(async () => null), // overridden per test
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      bookTitle: { findUnique: jest.fn(async () => ({ title: 'Mock Book' })) },
      device: { findUnique: jest.fn(async () => ({ name: 'Mock Device' })) },
      studyRoom: { findUnique: jest.fn(async () => ({ name: 'Mock Room' })) },
      // Support interactive transactions (callback form) by calling with prisma as tx.
      $transaction: jest.fn(async (arg: any) =>
        typeof arg === 'function' ? arg(prisma) : arg,
      ),
    };
    waitlist = { enqueue: jest.fn() };
    points = { apply: jest.fn(), applyFixed: jest.fn() };
    systemConfig = {
      get: jest.fn().mockResolvedValue({
        tiers: [
          { tier: 'Tier 1', threshold: 0, books: 1, devices: 1, rooms: 1 },
          { tier: 'Tier 2', threshold: 200, books: 2, devices: 1, rooms: 1 },
          { tier: 'Tier 3', threshold: 500, books: 3, devices: 2, rooms: 1 },
          { tier: 'Tier 4', threshold: 1000, books: 4, devices: 3, rooms: 2 },
          { tier: 'Tier 5', threshold: 2000, books: 5, devices: 3, rooms: 2 },
        ],
        penalties: [],
        toggles: [],
      }),
    };
    audit = { log: jest.fn() };
    const notif = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BookingService(
      prisma as any,
      waitlist as any,
      points as any,
      systemConfig as any,
      audit as any,
      notif as any,
    );
  });

  const tier3 = { id: 'u1', tier: 3, role: 'STUDENT' };

  function book(overrides: any = {}) {
    return service.create('u1', {
      resourceType: 'BOOK',
      resourceId: 'r1',
      startAt: iso(0),
      endAt: iso(DAY),
      ...overrides,
    } as any);
  }

  it('BOOK with a free copy -> APPROVED, RESERVED status, assetTag as qrToken', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    // No existing duplicate booking.
    prisma.booking.findFirst.mockResolvedValue(null);
    // Simulate one available copy; updateMany claims it as RESERVED.
    const mockCopy = { id: 'c1', assetTag: 'BK-CC-001', bookTitleId: 'r1' };
    prisma.bookCopy.findFirst.mockResolvedValue(mockCopy);
    prisma.bookCopy.updateMany.mockResolvedValue({ count: 1 });
    const b = await book();
    expect(b.status).toBe('APPROVED');
    expect(b.qrToken).toBe('BK-CC-001'); // asset tag, not a UUID
    expect(b.bookCopyId).toBe('c1');
  });

  it('BOOK with no free copy -> WAITLIST and enqueues', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    // No existing duplicate booking.
    prisma.booking.findFirst.mockResolvedValue(null);
    // No available copy found.
    prisma.bookCopy.findFirst.mockResolvedValue(null);
    const b = await book({ message: 'need it' });
    expect(b.status).toBe('WAITLIST');
    expect(b.qrToken).toBeNull();
    expect(waitlist.enqueue).toHaveBeenCalled();
  });

  it('DEVICE tier 1-3 available -> APPROVED', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    prisma.device.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'AVAILABLE',
      deviceTier: 3,
    });
    const b = await service.create('u1', {
      resourceType: 'DEVICE',
      resourceId: 'r1',
      startAt: iso(0),
      endAt: iso(DAY),
    } as any);
    expect(b.status).toBe('APPROVED');
  });

  it('DEVICE tier 4-5 available -> PENDING (staff approval)', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    prisma.device.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'AVAILABLE',
      deviceTier: 5,
    });
    const b = await service.create('u1', {
      resourceType: 'DEVICE',
      resourceId: 'r1',
      startAt: iso(0),
      endAt: iso(DAY),
    } as any);
    expect(b.status).toBe('PENDING');
  });

  it('DEVICE unavailable -> WAITLIST', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    prisma.device.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'BORROWED',
      deviceTier: 3,
    });
    const b = await service.create('u1', {
      resourceType: 'DEVICE',
      resourceId: 'r1',
      startAt: iso(0),
      endAt: iso(DAY),
    } as any);
    expect(b.status).toBe('WAITLIST');
  });

  it('ROOM with no overlap -> APPROVED', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    const b = await service.create('u1', {
      resourceType: 'ROOM',
      resourceId: 'r1',
      startAt: iso(0),
      endAt: iso(2 * HOUR),
    } as any);
    expect(b.status).toBe('APPROVED');
  });

  it('rejects when over the tier concurrency limit', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', tier: 1 }); // BOOK limit = 1
    prisma.booking.count.mockResolvedValue(1);
    await expect(book()).rejects.toThrow(BadRequestException);
  });

  it('rejects when the duration exceeds the cap', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    await expect(book({ endAt: iso(20 * DAY) })).rejects.toThrow(
      BadRequestException,
    ); // > 14d book cap
  });

  it('rejects a duplicate booking for the same book title', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue(tier3);
    // The duplicate guard finds an existing active booking for this title.
    prisma.booking.findFirst.mockResolvedValue({
      id: 'existing',
      status: 'WAITLIST',
    });
    await expect(book()).rejects.toThrow(/already have an active booking/i);
  });
});

describe('BookingService.cancel (copy release)', () => {
  let service: BookingService;
  let prisma: any;
  let waitlist: {
    enqueue: jest.Mock;
    dismiss: jest.Mock;
    onResourceFreed: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      booking: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(async () => ({
          id: 'b1',
          resourceType: 'BOOK',
          user: { name: 'Alice', email: 'a@iit.ac.lk' },
          bookTitle: { title: 'Clean Code' },
          device: null,
          studyRoom: null,
        })),
      },
      bookCopy: { update: jest.fn(async () => ({})) },
    };
    waitlist = {
      enqueue: jest.fn(),
      dismiss: jest.fn(),
      onResourceFreed: jest.fn(),
    };
    const points = {
      apply: jest.fn(),
      applyFixed: jest.fn(),
      applyFromConfig: jest.fn(),
    };
    const systemConfig = { get: jest.fn() };
    const audit = { log: jest.fn() };
    const notif = { create: jest.fn(async () => ({})) };
    service = new BookingService(
      prisma as any,
      waitlist as any,
      points as any,
      systemConfig as any,
      audit as any,
      notif as any,
    );
  });

  it('releases the RESERVED copy and clears qrToken when cancelling an APPROVED book booking', async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'b1',
      userId: 'u1',
      status: 'APPROVED',
      resourceType: 'BOOK',
      bookTitleId: 't1',
      bookCopyId: 'c1',
      startAt: new Date(),
      waitlistEntry: null,
    });

    await service.cancel('u1', 'b1');

    // The pre-assigned copy goes back to AVAILABLE...
    expect(prisma.bookCopy.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'AVAILABLE' },
    });
    // ...the qrToken is cleared so the asset tag can be reused...
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', qrToken: null }),
      }),
    );
    // ...and the freed slot triggers the waitlist.
    expect(waitlist.onResourceFreed).toHaveBeenCalledWith('BOOK', 't1');
  });

  it("refuses to cancel another user's booking without admin override", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'b1',
      userId: 'owner',
      status: 'APPROVED',
      resourceType: 'BOOK',
      waitlistEntry: null,
    });
    await expect(service.cancel('intruder', 'b1')).rejects.toThrow(
      /another user/i,
    );
  });
});
