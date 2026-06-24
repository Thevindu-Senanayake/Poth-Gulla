import { describe, expect, it } from '@jest/globals';
import { pointsFloorForTier, tierFromPoints } from './tier.utils.js';

describe('tier.utils', () => {
    describe('tierFromPoints', () => {
        it.each([
            [0, 1],
            [199, 1],
            [200, 2],
            [499, 2],
            [500, 3],
            [999, 3],
            [1000, 4],
            [1999, 4],
            [2000, 5],
            [9999, 5],
        ])('maps %i points -> tier %i', (points, tier) => {
            expect(tierFromPoints(points)).toBe(tier);
        });
    });

    describe('pointsFloorForTier', () => {
        it.each([
            [1, 0],
            [2, 200],
            [3, 500],
            [4, 1000],
            [5, 2000],
        ])('tier %i floor = %i', (tier, floor) => {
            expect(pointsFloorForTier(tier)).toBe(floor);
        });

        it('returns 0 for an unknown tier', () => {
            expect(pointsFloorForTier(99)).toBe(0);
        });
    });
});
