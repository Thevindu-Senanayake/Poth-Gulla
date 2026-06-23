import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PointsController } from './points.controller.js';

const user = { userId: 'u1', role: 'STUDENT' };

describe('PointsController', () => {
    let controller: PointsController;
    let points: { history: jest.Mock };

    beforeEach(() => {
        points = { history: jest.fn() };
        controller = new PointsController(points as any);
    });

    describe('GET /points/me', () => {
        it('returns own history with paging metadata', async () => {
            points.history.mockResolvedValue([[{ id: 'p1' }], 1]);
            const res = await controller.mine(user as any, '2', '10');
            expect(points.history).toHaveBeenCalledWith('u1', 2, 10);
            expect(res).toEqual({ data: [{ id: 'p1' }], total: 1, page: 2, limit: 10 });
        });

        it('defaults to page 1 / limit 20', async () => {
            points.history.mockResolvedValue([[], 0]);
            await controller.mine(user as any);
            expect(points.history).toHaveBeenCalledWith('u1', 1, 20);
        });
    });

    describe('GET /points/:userId', () => {
        it('returns a target user history', async () => {
            points.history.mockResolvedValue([[], 0]);
            const res = await controller.forUser('u9', '1', '5');
            expect(points.history).toHaveBeenCalledWith('u9', 1, 5);
            expect(res.page).toBe(1);
        });
    });
});
