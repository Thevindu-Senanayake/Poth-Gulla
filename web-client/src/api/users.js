import { api } from './client';
import { adaptUser } from './adapters';

// GET /users -> { data, total, page, limit, totalPages }  (ADMIN, LIBRARY_STAFF)
export async function listUsers(params = {}) {
  const { data } = await api.get('/users', { params: { limit: 100, ...params } });
  return {
    items: (data.data ?? []).map(adaptUser),
    total: data.total ?? 0,
    totalPages: data.totalPages ?? 1,
    raw: data.data ?? [],
  };
}

export const getUser = (id) => api.get(`/users/${id}`).then((r) => adaptUser(r.data));

// PATCH /users/:id  (ADMIN) — name, role, userPoints, tier (tier<->points coupled by backend)
export const updateUser = (id, body) => api.patch(`/users/${id}`, body).then((r) => adaptUser(r.data));

export const disableUser = (id) => api.patch(`/users/${id}/disable`).then((r) => adaptUser(r.data));
export const enableUser = (id) => api.patch(`/users/${id}/enable`).then((r) => adaptUser(r.data));

// POST /auth/register  (ADMIN) — creates an account
export const registerUser = (body) => api.post('/auth/register', body).then((r) => r.data);
