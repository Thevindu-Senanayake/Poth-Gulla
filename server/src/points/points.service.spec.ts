import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PointsService } from './points.service.js';

describe('PointsService', () => {
    let service: PointsService;
    let prisma: {
        user: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
        pointEvent: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
        $transaction: jest.Mock;
    };

    beforeEach(() => {
        prisma = {
            user: {
                findUniqueOrThrow: jest.fn(),
                update: jest.fn((args) => args),
            },
            pointEvent: { create: jest.fn((args) => args), findMany: jest.fn(), count: jest.fn() },
            // Return the array of operations as-is; apply() only reads [0].
            $transaction: jest.fn(async (ops) => ops),
        };
        service = new PointsService(prisma as any);
    });

    it('adds a positive delta and recomputes the tier', async () => {
        prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', userPoints: 950, tier: 3 });
        await service.apply('u1', 'BOOK_RETURNED_ON_TIME', 100);
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'u1' },
            data: { userPoints: 1050, tier: 4 }, // crossed the Tier 4 floor
        });
        expect(prisma.pointEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ action: 'BOOK_RETURNED_ON_TIME', delta: 100, balanceAfter: 1050 }),
        });
    });

    it('floors the balance at 0 on a large penalty', async () => {
        prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', userPoints: 30, tier: 1 });
        await service.apply('u1', 'BOOK_LATE_7D_PLUS', -220);
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'u1' },
            data: { userPoints: 0, tier: 1 },
        });
    });

    it('leaves tier null for operational roles (staff/admin)', async () => {
        prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'a1', userPoints: 0, tier: null });
        await service.apply('a1', 'ACCOUNT_CREATED', 500);
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'a1' },
            data: { userPoints: 500, tier: null },
        });
    });

    it('applyFixed looks up the canonical delta', async () => {
        prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', userPoints: 500, tier: 3 });
        await service.applyFixed('u1', 'ROOM_NO_SHOW');
        expect(prisma.pointEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ action: 'ROOM_NO_SHOW', delta: -150, balanceAfter: 350 }),
        });
    });
});
