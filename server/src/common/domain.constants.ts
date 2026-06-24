import { ResourceType, Role } from '../../generated/prisma/client.js';

// Re-export the canonical tier derivation function under the name used by PointsService.
export { tierFromPoints as tierForPoints } from '../users/tier.utils.js';

/**
 * Concurrent APPROVED+PENDING booking limits per patron tier per resource type.
 * Source of truth: CLAUDE.md §7B. Admin/Staff have tier=null and bypass these checks.
 */
export const TIER_LIMITS: Record<number, Record<ResourceType, number>> = {
  1: { BOOK: 1, DEVICE: 1, ROOM: 1 },
  2: { BOOK: 2, DEVICE: 1, ROOM: 1 },
  3: { BOOK: 3, DEVICE: 2, ROOM: 1 },
  4: { BOOK: 4, DEVICE: 3, ROOM: 2 },
  5: { BOOK: 5, DEVICE: 3, ROOM: 2 },
};

/**
 * Waitlist role weights - objective factor in priority_score.
 * Operational roles (ADMIN, LIBRARY_STAFF) never join a waitlist, so their weight is 0.
 */
export const ROLE_WEIGHT: Record<Role, number> = {
  ADMIN: 0,
  LIBRARY_STAFF: 0,
  LECTURER: 5,
  STUDENT: 3,
};

/** Maximum booking duration per resource type (milliseconds). */
const DAY = 24 * 60 * 60 * 1000;
export const DURATION_CAP_MS: Record<ResourceType, number> = {
  BOOK: 14 * DAY,
  DEVICE: 7 * DAY,
  ROOM: 4 * 60 * 60 * 1000,
};

/** Device tier at or above this value requires manual staff approval. */
export const HIGH_TIER_DEVICE_MIN = 4;
