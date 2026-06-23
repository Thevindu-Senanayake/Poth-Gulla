import { api } from './client';
import { adaptBooking } from './adapters';

// POST /bookings — body: { resourceType, resourceId, startAt, endAt, message? }
// Backend routes to APPROVED | PENDING | WAITLIST and returns the booking.
export async function createBooking(body) {
  const { data } = await api.post('/bookings', body);
  return adaptBooking(data);
}

// GET /bookings/me — own bookings
export async function myBookings(params = {}) {
  const { data } = await api.get('/bookings/me', { params: { limit: 100, ...params } });
  return { items: (data.data ?? []).map(adaptBooking), total: data.total ?? 0 };
}

// GET /bookings — all (ADMIN, LIBRARY_STAFF). Use status=PENDING for the device-approval queue.
export async function allBookings(params = {}) {
  const { data } = await api.get('/bookings', { params: { limit: 100, ...params } });
  return { items: (data.data ?? []).map(adaptBooking), total: data.total ?? 0 };
}

export const getBooking = (id) => api.get(`/bookings/${id}`).then((r) => adaptBooking(r.data));
export const approveBooking = (id) => api.patch(`/bookings/${id}/approve`).then((r) => adaptBooking(r.data));
export const rejectBooking = (id) => api.patch(`/bookings/${id}/reject`).then((r) => adaptBooking(r.data));
export const cancelBooking = (id) => api.post(`/bookings/${id}/cancel`).then((r) => adaptBooking(r.data));
export const cancelAnyBooking = (id) => api.post(`/bookings/${id}/cancel-any`).then((r) => adaptBooking(r.data));
