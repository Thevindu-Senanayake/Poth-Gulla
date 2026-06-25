import { api } from './client';
import { adaptBook } from './adapters';

// ---- Recommendations (LECTURER, STUDENT) ----
export async function myRecommendations(limit = 12) {
    const { data } = await api.get('/recommendations/me', { params: { limit } });
    return (data ?? []).map(adaptBook);
}

// ---- Audit log (ADMIN) ----
export async function auditLogs(params = {}) {
    const { data } = await api.get('/audit/logs', {
        params: { limit: 100, ...params },
    });
    return { items: data.data ?? [], meta: data.meta ?? {} };
}

// ---- Notifications ----
export async function myNotifications(params = {}) {
    const { data } = await api.get('/notifications/me', {
        params: { limit: 20, ...params },
    });
    return { items: data.data ?? [], meta: data.meta ?? {} };
}
export const markAllNotificationsRead = () =>
    api.post('/notifications/read-all').then((r) => r.data);

// ---- Overdue sweep (ADMIN, LIBRARY_STAFF) ----
export const runOverdueSweep = () => api.post('/overdue/run').then((r) => r.data);

// ---- Scan / QR workflow (ADMIN, LIBRARY_STAFF) ----
// The printed QR on every resource encodes the asset tag, so the second
// argument is optional; when omitted we send the asset tag for both fields
// so older backends still resolve the booking correctly.
export const scanCheckout = (assetTag, bookingQr) =>
    api.post('/scan/checkout', { bookingQr: bookingQr ?? assetTag, assetTag }).then((r) => r.data);
export const scanReturn = (assetTag, condition = 'GOOD') =>
    api.post('/scan/return', { assetTag, condition }).then((r) => r.data);
export const roomCheckin = (roomQr) =>
    api.post('/scan/room-checkin', { roomQr }).then((r) => r.data);

// ---- Reviews ----
export async function reviewsForBook(bookTitleId, params = {}) {
    const { data } = await api.get(`/reviews/book/${bookTitleId}`, {
        params: { limit: 20, ...params },
    });
    return { items: data.data ?? [], meta: data.meta ?? {} };
}
export const createReview = (bookTitleId, body) =>
    api.post(`/reviews/book/${bookTitleId}`, body).then((r) => r.data);
