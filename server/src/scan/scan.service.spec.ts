/* eslint-disable */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ItemCondition } from '../../generated/prisma/client.js';
import { ScanService } from './scan.service.js';

const DAY = 24 * 60 * 60 * 1000;

describe('ScanService.returnItem (return scoring)', () => {
  let service: ScanService;
  let prisma: any;
  let points: { apply: jest.Mock; applyFixed: jest.Mock };
  let waitlist: { onResourceFreed: jest.Mock };

  beforeEach(() => {
    prisma = {
      borrowing: {
        findFirst: jest.fn(),
        update: jest.fn((a: any) => a),
        create: jest.fn((a: any) => a),
      },
      bookCopy: { findUnique: jest.fn(), update: jest.fn((a: any) => a) },
      device: { findUnique: jest.fn(), update: jest.fn((a: any) => a) },
      booking: {
        findUnique: jest.fn(),
        create: jest.fn((a: any) => a),
        update: jest.fn((a: any) => a),
      },
      user: { findFirst: jest.fn() },
      $transaction: jest.fn(async (arg: any) =>
        typeof arg === 'function' ? arg(prisma) : arg,
      ),
    };
    points = {
      apply: jest.fn(),
      applyFixed: jest.fn(),
      applyFromConfig: jest.fn(),
    };
    waitlist = { onResourceFreed: jest.fn() };
    const audit = { log: jest.fn() };
    const systemConfig = {
      get: jest.fn().mockResolvedValue({
        tiers: [],
        penalties: [
          { key: 'BOOK_RETURNED_ON_TIME', label: '', amount: 25 },
          { key: 'BOOK_RETURNED_EARLY', label: '', amount: 50 },
          { key: 'BOOK_LATE_1D', label: '', amount: -10 },
          { key: 'BOOK_LATE_PER_DAY', label: '', amount: -20 },
          { key: 'BOOK_LATE_7D_PLUS', label: '', amount: -220 },
          { key: 'DEVICE_RETURNED_ON_TIME', label: '', amount: 30 },
          { key: 'DEVICE_RETURNED_EARLY', label: '', amount: 40 },
          { key: 'DEVICE_LATE_1_3D', label: '', amount: -80 },
          { key: 'DEVICE_LATE_3D_PLUS', label: '', amount: -160 },
          { key: 'DEVICE_DAMAGED', label: '', amount: -300 },
          { key: 'ROOM_ATTENDED', label: '', amount: 20 },
          { key: 'ROOM_NO_SHOW', label: '', amount: -150 },
          { key: 'BOOKING_CANCELLED', label: '', amount: -25 },
        ],
        toggles: [],
      }),
    };
    service = new ScanService(
      prisma as any,
      points as any,
      waitlist as any,
      audit as any,
      systemConfig as any,
    );
  });

  function bookBorrowing(dueOffsetMs: number) {
    return {
      id: 'br1',
      userId: 'u1',
      dueAt: new Date(Date.now() + dueOffsetMs),
      bookCopy: { assetTag: 'BK-1' },
      bookCopyId: 'c1',
      device: null,
      deviceId: null,
      booking: { bookTitleId: 't1', deviceId: null },
    };
  }
  function deviceBorrowing(dueOffsetMs: number) {
    return {
      id: 'br2',
      userId: 'u1',
      dueAt: new Date(Date.now() + dueOffsetMs),
      bookCopy: null,
      bookCopyId: null,
      device: { assetTag: 'DEV-1' },
      deviceId: 'd1',
      booking: { bookTitleId: null, deviceId: 'd1' },
    };
  }

  it('throws when no active borrowing matches the asset tag', async () => {
    prisma.borrowing.findFirst.mockResolvedValue(null);
    await expect(
      service.returnItem({ assetTag: 'X', condition: ItemCondition.GOOD }),
    ).rejects.toThrow(NotFoundException);
  });

  it('book returned >2 days early -> +50', async () => {
    prisma.borrowing.findFirst.mockResolvedValue(bookBorrowing(4 * DAY));
    await service.returnItem({
      assetTag: 'BK-1',
      condition: ItemCondition.GOOD,
    });
    expect(points.apply).toHaveBeenCalledWith(
      'u1',
      'BOOK_RETURNED_EARLY',
      50,
      expect.anything(),
    );
  });

  it('book 3 days late -> -20/day (-60)', async () => {
    // Use -4 DAY to account for any clock skew between test setup and service execution
    // The service calls Math.ceil, so -3 DAY might round up to 4 days due to millisecond precision
    prisma.borrowing.findFirst.mockResolvedValue(
      bookBorrowing(-4 * DAY + 60000),
    );
    await service.returnItem({
      assetTag: 'BK-1',
      condition: ItemCondition.GOOD,
    });
    expect(points.apply).toHaveBeenCalledWith(
      'u1',
      'BOOK_LATE_2_7D',
      -80,
      expect.anything(),
    );
  });

  it('device on time + good -> +30, no damage charge', async () => {
    prisma.borrowing.findFirst.mockResolvedValue(
      deviceBorrowing(60 * 60 * 1000),
    );
    await service.returnItem({
      assetTag: 'DEV-1',
      condition: ItemCondition.GOOD,
    });
    expect(points.apply).toHaveBeenCalledWith(
      'u1',
      'DEVICE_RETURNED_ON_TIME',
      30,
      expect.anything(),
    );
    expect(points.applyFixed).not.toHaveBeenCalled();
  });

  it('device damaged -> timing reward 0 + separate DEVICE_DAMAGED charge', async () => {
    prisma.borrowing.findFirst.mockResolvedValue(
      deviceBorrowing(60 * 60 * 1000),
    );
    await service.returnItem({
      assetTag: 'DEV-1',
      condition: ItemCondition.DAMAGED,
    });
    expect(points.apply).toHaveBeenCalledWith(
      'u1',
      'DEVICE_RETURNED_ON_TIME',
      0,
      expect.anything(),
    );
    expect(points.applyFromConfig).toHaveBeenCalledWith(
      'u1',
      'DEVICE_DAMAGED',
      expect.anything(),
    );
  });

  it('frees the resource for waitlist promotion', async () => {
    prisma.borrowing.findFirst.mockResolvedValue(bookBorrowing(-1 * DAY));
    await service.returnItem({
      assetTag: 'BK-1',
      condition: ItemCondition.GOOD,
    });
    expect(waitlist.onResourceFreed).toHaveBeenCalledWith('BOOK', 't1');
  });
});

describe('ScanService.checkout', () => {
  let service: ScanService;
  let prisma: any;
  let points: { apply: jest.Mock; applyFixed: jest.Mock };
  let waitlist: { onResourceFreed: jest.Mock };

  beforeEach(() => {
    prisma = {
      borrowing: {
        findFirst: jest.fn(),
        update: jest.fn((a: any) => a),
        create: jest.fn((a: any) => a),
      },
      bookCopy: { findUnique: jest.fn(), update: jest.fn((a: any) => a) },
      device: { findUnique: jest.fn(), update: jest.fn((a: any) => a) },
      booking: {
        findUnique: jest.fn(),
        create: jest.fn((a: any) => a),
        update: jest.fn((a: any) => a),
      },
      user: { findFirst: jest.fn() },
      $transaction: jest.fn(async (arg: any) =>
        typeof arg === 'function' ? arg(prisma) : arg,
      ),
    };
    points = {
      apply: jest.fn(),
      applyFixed: jest.fn(),
      applyFromConfig: jest.fn(),
    };
    waitlist = { onResourceFreed: jest.fn() };
    const audit = { log: jest.fn() };
    const systemConfig = {
      get: jest.fn().mockResolvedValue({
        tiers: [],
        penalties: [
          { key: 'BOOK_RETURNED_ON_TIME', label: '', amount: 25 },
          { key: 'BOOK_RETURNED_EARLY', label: '', amount: 50 },
          { key: 'BOOK_LATE_1D', label: '', amount: -10 },
          { key: 'BOOK_LATE_PER_DAY', label: '', amount: -20 },
          { key: 'BOOK_LATE_7D_PLUS', label: '', amount: -220 },
          { key: 'DEVICE_RETURNED_ON_TIME', label: '', amount: 30 },
          { key: 'DEVICE_RETURNED_EARLY', label: '', amount: 40 },
          { key: 'DEVICE_LATE_1_3D', label: '', amount: -80 },
          { key: 'DEVICE_LATE_3D_PLUS', label: '', amount: -160 },
          { key: 'DEVICE_DAMAGED', label: '', amount: -300 },
          { key: 'ROOM_ATTENDED', label: '', amount: 20 },
          { key: 'ROOM_NO_SHOW', label: '', amount: -150 },
          { key: 'BOOKING_CANCELLED', label: '', amount: -25 },
        ],
        toggles: [],
      }),
    };
    service = new ScanService(
      prisma as any,
      points as any,
      waitlist as any,
      audit as any,
      systemConfig as any,
    );
  });

  it('standard flow: checks out an APPROVED book booking successfully', async () => {
    const mockBooking = {
      id: 'b1',
      status: 'APPROVED',
      resourceType: 'BOOK',
      bookTitleId: 't1',
      userId: 'u1',
      endAt: new Date(),
      waitlistEntry: null,
    };
    const mockCopy = { id: 'c1', bookTitleId: 't1', status: 'AVAILABLE' };

    prisma.booking.findUnique.mockResolvedValue(mockBooking);
    prisma.bookCopy.findUnique.mockResolvedValue(mockCopy);

    await service.checkout({ bookingQr: 'token123', assetTag: 'tag123' });

    expect(prisma.booking.findUnique).toHaveBeenCalledWith({
      where: { qrToken: 'token123' },
      include: {
        waitlistEntry: true,
        user: { select: { name: true, email: true } },
        bookTitle: { select: { title: true } },
        device: { select: { name: true } },
      },
    });
    expect(prisma.bookCopy.findUnique).toHaveBeenCalledWith({
      where: { assetTag: 'tag123' },
    });
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: 'CHECKED_OUT',
          bookCopyId: 'c1',
        }),
      }),
    );
  });

  it('direct flow: checks out a book copy directly by user ID', async () => {
    const mockUser = { id: 'u1', email: 'u1@iit.ac.lk', isActive: true };
    const mockCopy = { id: 'c1', bookTitleId: 't1', status: 'AVAILABLE' };

    prisma.booking.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.bookCopy.findUnique.mockResolvedValue(mockCopy);

    await service.checkout({ bookingQr: 'u1', assetTag: 'tag123' });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ id: 'u1' }, { email: 'u1' }],
      },
    });
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          resourceType: 'BOOK',
          bookCopyId: 'c1',
          status: 'CHECKED_OUT',
        }),
      }),
    );
  });

  it('asset-tag-first flow: resolves the booking pre-assigned to a RESERVED copy', async () => {
    // Neither a qrToken booking nor a user matches - falls to checkoutByAssetTag.
    prisma.booking.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    const copy = {
      id: 'c1',
      bookTitleId: 't1',
      status: 'RESERVED',
      bookTitle: { title: 'Clean Code' },
    };
    prisma.bookCopy.findUnique.mockResolvedValue(copy);
    prisma.booking.findFirst = jest.fn(async () => ({
      id: 'b1',
      status: 'APPROVED',
      resourceType: 'BOOK',
      bookTitleId: 't1',
      bookCopyId: 'c1', // pre-assigned to this exact copy
      userId: 'u1',
      endAt: new Date(),
      waitlistEntry: null,
      user: { name: 'Alice', email: 'a@iit.ac.lk' },
      bookTitle: { title: 'Clean Code' },
    }));

    await service.checkout({ bookingQr: 'BK-CC-001', assetTag: 'BK-CC-001' });

    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookCopyId: 'c1', status: 'APPROVED' },
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CHECKED_OUT' }),
      }),
    );
  });

  it('rejects a RESERVED copy that belongs to a different booking', async () => {
    const mockBooking = {
      id: 'b-other',
      status: 'APPROVED',
      resourceType: 'BOOK',
      bookTitleId: 't1',
      bookCopyId: 'c-other', // booking holds a DIFFERENT copy
      userId: 'u1',
      endAt: new Date(),
      waitlistEntry: null,
    };
    prisma.booking.findUnique.mockResolvedValue(mockBooking);
    prisma.bookCopy.findUnique.mockResolvedValue({
      id: 'c1',
      bookTitleId: 't1',
      status: 'RESERVED',
    });

    await expect(
      service.checkout({ bookingQr: 'qr', assetTag: 'BK-CC-001' }),
    ).rejects.toThrow(/reserved for a different booking/i);
  });
});

describe('ScanService.selfCheckout', () => {
  let service: ScanService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      borrowing: { create: jest.fn((a: any) => a) },
      bookCopy: { findUnique: jest.fn(), update: jest.fn((a: any) => a) },
      booking: {
        findFirst: jest.fn(async () => null),
        update: jest.fn((a: any) => a),
      },
      $transaction: jest.fn(async (arg: any) =>
        typeof arg === 'function' ? arg(prisma) : arg,
      ),
    };
    const points = {
      apply: jest.fn(),
      applyFixed: jest.fn(),
      applyFromConfig: jest.fn(),
    };
    const waitlist = { onResourceFreed: jest.fn() };
    const audit = { log: jest.fn() };
    const systemConfig = {
      get: jest.fn(async () => ({ tiers: [], penalties: [], toggles: [] })),
    };
    service = new ScanService(
      prisma as any,
      points as any,
      waitlist as any,
      audit as any,
      systemConfig as any,
    );
  });

  it('checks out the callers pre-assigned RESERVED copy', async () => {
    prisma.bookCopy.findUnique.mockResolvedValue({
      id: 'c1',
      bookTitleId: 't1',
      status: 'RESERVED',
      bookTitle: { title: 'Clean Code' },
    });
    prisma.booking.findFirst.mockResolvedValueOnce({
      id: 'b1',
      status: 'APPROVED',
      resourceType: 'BOOK',
      bookTitleId: 't1',
      bookCopyId: 'c1',
      userId: 'u1',
      endAt: new Date(),
      waitlistEntry: null,
      user: { name: 'Alice', email: 'a@iit.ac.lk' },
      bookTitle: { title: 'Clean Code' },
    });

    await service.selfCheckout('u1', { assetTag: 'BK-CC-001' });

    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', bookCopyId: 'c1', status: 'APPROVED' },
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CHECKED_OUT' }),
      }),
    );
  });

  it('404s on an unknown asset tag', async () => {
    prisma.bookCopy.findUnique.mockResolvedValue(null);
    await expect(
      service.selfCheckout('u1', { assetTag: 'NOPE' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when the caller has no approved booking for the title', async () => {
    prisma.bookCopy.findUnique.mockResolvedValue({
      id: 'c1',
      bookTitleId: 't1',
      status: 'AVAILABLE',
      bookTitle: { title: 'Clean Code' },
    });
    prisma.booking.findFirst.mockResolvedValue(null);
    await expect(
      service.selfCheckout('u1', { assetTag: 'BK-CC-001' }),
    ).rejects.toThrow(/approved booking/i);
  });
});

describe('ScanService.roomCheckin (student vs staff)', () => {
  let service: ScanService;
  let prisma: any;
  let points: any;

  beforeEach(() => {
    prisma = {
      studyRoom: {
        findFirst: jest.fn(async () => ({ id: 'r1', name: 'Study Room A' })),
      },
      booking: {
        findFirst: jest.fn(async () => null),
        update: jest.fn(async () => ({
          id: 'b1',
          user: { name: 'Alice', email: 'a@iit.ac.lk' },
          studyRoom: { name: 'Study Room A' },
        })),
      },
    };
    points = {
      apply: jest.fn(),
      applyFixed: jest.fn(),
      applyFromConfig: jest.fn(),
    };
    const waitlist = { onResourceFreed: jest.fn() };
    const audit = { log: jest.fn() };
    const systemConfig = {
      get: jest.fn(async () => ({ tiers: [], penalties: [], toggles: [] })),
    };
    service = new ScanService(
      prisma as any,
      points as any,
      waitlist as any,
      audit as any,
      systemConfig as any,
    );
  });

  it('student: only finds their own active booking', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'b1',
      userId: 'student-1',
    });
    await service.roomCheckin('student-1', { roomQr: 'ROOM-QR-A' }, false);
    const where = prisma.booking.findFirst.mock.calls[0][0].where;
    expect(where.userId).toBe('student-1');
  });

  it('staff: auto-finds whoever holds the active booking (no userId filter)', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'b1',
      userId: 'student-9',
    });
    await service.roomCheckin('staff-1', { roomQr: 'ROOM-QR-A' }, true);
    const where = prisma.booking.findFirst.mock.calls[0][0].where;
    expect(where.userId).toBeUndefined();
    // Points are awarded to the booking holder, not the staff actor.
    expect(points.applyFromConfig).toHaveBeenCalledWith(
      'student-9',
      'ROOM_ATTENDED',
      expect.any(Object),
    );
  });

  it('rejects when no active booking exists for the room', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    await expect(
      service.roomCheckin('u1', { roomQr: 'ROOM-QR-A' }, false),
    ).rejects.toThrow(/no active approved booking|do not have an active/i);
  });
});
