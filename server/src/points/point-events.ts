/** All events that can mutate a user's point balance. */
export type PointAction =
  | 'BOOK_RETURNED_EARLY'
  | 'BOOK_RETURNED_ON_TIME'
  | 'BOOK_LATE_1D'
  | 'BOOK_LATE_2_7D' // dynamic: delta = -20 * daysLate
  | 'BOOK_LATE_7D_PLUS'
  | 'BOOK_REVIEW'
  | 'DEVICE_RETURNED_ON_TIME'
  | 'DEVICE_RETURNED_EARLY'
  | 'DEVICE_LATE_1_3D'
  | 'DEVICE_LATE_3D_PLUS'
  | 'DEVICE_DAMAGED'
  | 'ROOM_ATTENDED'
  | 'ROOM_CANCEL_EARLY'
  | 'ROOM_CANCEL_LATE'
  | 'ROOM_NO_SHOW'
  | 'ACCOUNT_CREATED'
  | 'WAITLIST_FULFILLED'
  | 'BOOKING_CANCELLED';

/**
 * Fixed point deltas per event. Source of truth: DEVELOPMENT.md §7B.
 * BOOK_LATE_2_7D is excluded because its delta is dynamic (-20 × daysLate).
 */
export const POINT_DELTA: Record<
  Exclude<PointAction, 'BOOK_LATE_2_7D'>,
  number
> = {
  BOOK_RETURNED_EARLY: 50,
  BOOK_RETURNED_ON_TIME: 25,
  BOOK_LATE_1D: -10,
  BOOK_LATE_7D_PLUS: -220,
  BOOK_REVIEW: 15,
  DEVICE_RETURNED_ON_TIME: 30,
  DEVICE_RETURNED_EARLY: 40,
  DEVICE_LATE_1_3D: -80,
  DEVICE_LATE_3D_PLUS: -160,
  DEVICE_DAMAGED: -300,
  ROOM_ATTENDED: 20,
  ROOM_CANCEL_EARLY: 0,
  ROOM_CANCEL_LATE: -60,
  ROOM_NO_SHOW: -150,
  ACCOUNT_CREATED: 500,
  WAITLIST_FULFILLED: 10,
  BOOKING_CANCELLED: -25,
};
