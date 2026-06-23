import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '../../generated/prisma/client.js';
import { RecommendationController } from './recommendation.controller.js';

const user = { userId: 'u1', role: Role.STUDENT };

describe('RecommendationController', () => {
    let controller: RecommendationController;
    let rec: { forUser: jest.Mock };

    beforeEach(() => {
        rec = { forUser: jest.fn() };
        controller = new RecommendationController(rec as any);
    });

    it('GET /recommendations/me uses the default limit of 10', () => {
        controller.getForMe(user as any);
        expect(rec.forUser).toHaveBeenCalledWith('u1', 10);
    });

    it('honours a supplied limit', () => {
        controller.getForMe(user as any, '5');
        expect(rec.forUser).toHaveBeenCalledWith('u1', 5);
    });

    it('clamps the limit to a maximum of 50', () => {
        controller.getForMe(user as any, '500');
        expect(rec.forUser).toHaveBeenCalledWith('u1', 50);
    });

    it('floors the limit at 1 for non-positive input', () => {
        controller.getForMe(user as any, '0');
        expect(rec.forUser).toHaveBeenCalledWith('u1', 1);
    });
});
