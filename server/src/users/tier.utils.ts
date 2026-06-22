/**
 * Tier floors — the minimum user points required to hold each tier.
 * Tier 1 (Restricted) is the lowest; Tier 5 (Elite) is the highest.
 * Source of truth: CLAUDE.md §7B.
 *
 *   Tier 1 — Restricted  0–199
 *   Tier 2 — Basic       200–499
 *   Tier 3 — Regular     500–999   ← new patrons start here (500 pts)
 *   Tier 4 — Trusted     1,000–1,999
 *   Tier 5 — Elite       2,000+
 *
 * Admin / Library Staff are operational roles and carry no tier (null).
 */
export const TIER_FLOORS: Record<number, number> = {
    1: 0,
    2: 200,
    3: 500,
    4: 1000,
    5: 2000,
};

/** Derive tier from a points value (patron roles only). */
export function tierFromPoints(points: number): number {
    if (points >= TIER_FLOORS[5]) return 5;
    if (points >= TIER_FLOORS[4]) return 4;
    if (points >= TIER_FLOORS[3]) return 3;
    if (points >= TIER_FLOORS[2]) return 2;
    return 1;
}

/** Return the minimum points for a given tier (used on promotion). */
export function pointsFloorForTier(tier: number): number {
    return TIER_FLOORS[tier] ?? 0;
}
