import { api } from './client';
import { adaptBook } from './adapters';

// ---- Recommendations (LECTURER, STUDENT) ----
// GET /recommendations/me -> BookTitle[]
export async function myRecommendations(limit = 12) {
  const { data } = await api.get('/recommendations/me', { params: { limit } });
  return (data ?? []).map(adaptBook);
}

// ---- Audit log (ADMIN) ----
// GET /audit/logs -> { data:[{id,action,targetType,targetId,metadata,createdAt,actor:{id,name,role}}], meta }
export async function auditLogs(params = {}) {
  const { data } = await api.get('/audit/logs', { params: { limit: 100, ...params } });
  return { items: data.data ?? [], meta: data.meta ?? {} };
}

// ---- Notifications ----
export async function myNotifications(params = {}) {
  const { data } = await api.get('/notifications/me', { params: { limit: 20, ...params } });
  return { items: data.data ?? [], meta: data.meta ?? {} };
}
export const markAllNotificationsRead = () => api.post('/notifications/read-all').then((r) => r.data);

// ---- Overdue sweep (ADMIN, LIBRARY_STAFF) ----
export const runOverdueSweep = () => api.post('/overdue/run').then((r) => r.data);

// ---- Scan / QR workflow (ADMIN, LIBRARY_STAFF) ----
export const scanCheckout = (bookingQr, assetTag) =>
  api.post('/scan/checkout', { bookingQr, assetTag }).then((r) => r.data);
export const scanReturn = (assetTag, condition = 'GOOD') =>
  api.post('/scan/return', { assetTag, condition }).then((r) => r.data);
export const roomCheckin = (roomQr) =>
  api.post('/scan/room-checkin', { roomQr }).then((r) => r.data);

// ---- Reviews ----
export async function reviewsForBook(bookTitleId, params = {}) {
  const { data } = await api.get(`/reviews/book/${bookTitleId}`, { params: { limit: 20, ...params } });
  return { items: data.data ?? [], meta: data.meta ?? {} };
}
export const createReview = (bookTitleId, body) =>
  api.post(`/reviews/book/${bookTitleId}`, body).then((r) => r.data);
