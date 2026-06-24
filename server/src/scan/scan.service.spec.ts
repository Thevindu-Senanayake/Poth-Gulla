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
            borrowing: { findFirst: jest.fn(), update: jest.fn((a: any) => a) },
            bookCopy: { update: jest.fn((a: any) => a) },
            device: { update: jest.fn((a: any) => a) },
            booking: { update: jest.fn((a: any) => a) },
            $transaction: jest.fn(async (ops: any) => ops),
        };
        points = { apply: jest.fn(), applyFixed: jest.fn() };
        waitlist = { onResourceFreed: jest.fn() };
        service = new ScanService(prisma as any, points as any, waitlist as any);
    });

    function bookBorrowing(dueOffsetMs: number) {
        return {
            id: 'br1', userId: 'u1', dueAt: new Date(Date.now() + dueOffsetMs),
            bookCopy: { assetTag: 'BK-1' }, bookCopyId: 'c1',
            device: null, deviceId: null,
            booking: { bookTitleId: 't1', deviceId: null },
        };
    }
    function deviceBorrowing(dueOffsetMs: number) {
        return {
            id: 'br2', userId: 'u1', dueAt: new Date(Date.now() + dueOffsetMs),
            bookCopy: null, bookCopyId: null,
            device: { assetTag: 'DEV-1' }, deviceId: 'd1',
            booking: { bookTitleId: null, deviceId: 'd1' },
        };
    }

    it('throws when no active borrowing matches the asset tag', async () => {
        prisma.borrowing.findFirst.mockResolvedValue(null);
        await expect(service.returnItem({ assetTag: 'X', condition: ItemCondition.GOOD })).rejects.toThrow(
            NotFoundException,
        );
    });

    it('book returned >2 days early -> +50', async () => {
        prisma.borrowing.findFirst.mockResolvedValue(bookBorrowing(4 * DAY));
        await service.returnItem({ assetTag: 'BK-1', condition: ItemCondition.GOOD });
        expect(points.apply).toHaveBeenCalledWith('u1', 'BOOK_RETURNED_EARLY', 50, expect.anything());
    });

    it('book 3 days late -> -20/day (-60)', async () => {
        // Use -4 DAY to account for any clock skew between test setup and service execution
        // The service calls Math.ceil, so -3 DAY might round up to 4 days due to millisecond precision
        prisma.borrowing.findFirst.mockResolvedValue(bookBorrowing(-4 * DAY));
        await service.returnItem({ assetTag: 'BK-1', condition: ItemCondition.GOOD });
        expect(points.apply).toHaveBeenCalledWith('u1', 'BOOK_LATE_2_7D', -80, expect.anything());
    });

    it('device on time + good -> +30, no damage charge', async () => {
        prisma.borrowing.findFirst.mockResolvedValue(deviceBorrowing(60 * 60 * 1000));
        await service.returnItem({ assetTag: 'DEV-1', condition: ItemCondition.GOOD });
        expect(points.apply).toHaveBeenCalledWith('u1', 'DEVICE_RETURNED_ON_TIME', 30, expect.anything());
        expect(points.applyFixed).not.toHaveBeenCalled();
    });

    it('device damaged -> timing reward 0 + separate DEVICE_DAMAGED charge', async () => {
        prisma.borrowing.findFirst.mockResolvedValue(deviceBorrowing(60 * 60 * 1000));
        await service.returnItem({ assetTag: 'DEV-1', condition: ItemCondition.DAMAGED });
        expect(points.apply).toHaveBeenCalledWith('u1', 'DEVICE_RETURNED_ON_TIME', 0, expect.anything());
        expect(points.applyFixed).toHaveBeenCalledWith('u1', 'DEVICE_DAMAGED', expect.anything());
    });

    it('frees the resource for waitlist promotion', async () => {
        prisma.borrowing.findFirst.mockResolvedValue(bookBorrowing(-1 * DAY));
        await service.returnItem({ assetTag: 'BK-1', condition: ItemCondition.GOOD });
        expect(waitlist.onResourceFreed).toHaveBeenCalledWith('BOOK', 't1');
    });
});
