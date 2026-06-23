import { api } from './client';

// GET /points/me -> { data:[{id,action,delta,balanceAfter,metadata,createdAt}], total, page, limit }
export async function myPoints(params = {}) {
  const { data } = await api.get('/points/me', { params: { limit: 50, ...params } });
  return { items: data.data ?? [], total: data.total ?? 0 };
}

// GET /points/:userId (ADMIN, LIBRARY_STAFF)
export async function pointsForUser(userId, params = {}) {
  const { data } = await api.get(`/points/${userId}`, { params: { limit: 50, ...params } });
  return { items: data.data ?? [], total: data.total ?? 0 };
}
