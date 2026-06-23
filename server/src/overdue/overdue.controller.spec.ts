import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '../../generated/prisma/client.js';
import { OverdueController } from './overdue.controller.js';

const user = { userId: 'u1', role: Role.STUDENT };

describe('OverdueController', () => {
    let controller: OverdueController;
    let overdue: { runSweep: jest.Mock };
    let prisma: {
        notification: {
            findMany: jest.Mock;
            count: jest.Mock;
            updateMany: jest.Mock;
        };
    };

    beforeEach(() => {
        overdue = { runSweep: jest.fn() };
        prisma = {
            notification: {
                findMany: jest.fn(),
                count: jest.fn(),
                updateMany: jest.fn(),
            },
        };
        controller = new OverdueController(overdue as any, prisma as any);
    });

    it('POST /overdue/run triggers the sweep', () => {
        controller.runSweep();
        expect(overdue.runSweep).toHaveBeenCalled();
    });

    describe('GET /notifications/me', () => {
        it('returns paginated notifications for the user', async () => {
            prisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
            prisma.notification.count.mockResolvedValue(1);
            const res = await controller.myNotifications(user as any, '1', '20', 'false');
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'u1' },
                    skip: 0,
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                }),
            );
            expect(res.meta).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
        });

        it('applies the unread filter when unreadOnly=true', async () => {
            prisma.notification.findMany.mockResolvedValue([]);
            prisma.notification.count.mockResolvedValue(0);
            await controller.myNotifications(user as any, '1', '20', 'true');
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 'u1', read: false } }),
            );
        });

        it('clamps limit to 100', async () => {
            prisma.notification.findMany.mockResolvedValue([]);
            prisma.notification.count.mockResolvedValue(0);
            await controller.myNotifications(user as any, '1', '999', 'false');
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 100 }),
            );
        });
    });

    it('POST /notifications/read-all marks unread as read', () => {
        controller.markAllRead(user as any);
        expect(prisma.notification.updateMany).toHaveBeenCalledWith({
            where: { userId: 'u1', read: false },
            data: { read: true },
        });
    });
});
