import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '../../generated/prisma/client.js';
import { ReviewController } from './review.controller.js';

const user = { userId: 'u1', role: Role.STUDENT };

describe('ReviewController', () => {
    let controller: ReviewController;
    let review: { listByBook: jest.Mock; create: jest.Mock; remove: jest.Mock };

    beforeEach(() => {
        review = {
            listByBook: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
        };
        controller = new ReviewController(review as any);
    });

    describe('GET /reviews/book/:bookTitleId', () => {
        it('returns paginated reviews with meta', async () => {
            review.listByBook.mockResolvedValue([[{ id: 'r1' }], 1]);
            const res = await controller.listByBook('t1', '1', '20');
            expect(review.listByBook).toHaveBeenCalledWith('t1', 1, 20);
            expect(res.meta).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
        });

        it('clamps limit to 100 and floors page at 1', async () => {
            review.listByBook.mockResolvedValue([[], 0]);
            await controller.listByBook('t1', '0', '500');
            expect(review.listByBook).toHaveBeenCalledWith('t1', 1, 100);
        });
    });

    it('POST /reviews/book/:bookTitleId creates a review for the current user', () => {
        const dto = { rating: 5, comment: 'great' } as any;
        controller.create(user as any, 't1', dto);
        expect(review.create).toHaveBeenCalledWith('u1', 't1', dto);
    });

    it('DELETE /reviews/:id passes user id and role for ownership/role check', () => {
        controller.remove(user as any, 'r1');
        expect(review.remove).toHaveBeenCalledWith('u1', Role.STUDENT, 'r1');
    });
});
