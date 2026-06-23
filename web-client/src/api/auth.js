import { api } from './client';

// Backend Role enum -> the role keys this front-end uses internally.
export const ROLE_MAP = {
  ADMIN: 'admin',
  LIBRARY_STAFF: 'staff',
  LECTURER: 'lecturer',
  STUDENT: 'student',
};

export const ROLE_LABEL = {
  ADMIN: 'Administrator',
  LIBRARY_STAFF: 'Library Staff',
  LECTURER: 'Lecturer',
  STUDENT: 'Student',
};

// POST /auth/login -> { accessToken, user: { id, email, name, role, userPoints, tier, isActive } }
export async function login(email, password) {
  // Clear any stale token first so the request interceptor doesn't attach a Bearer header
  // (the backend returns 409 "Already authenticated" if a still-valid token is sent to /auth/login).
  localStorage.removeItem('accessToken');
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('accessToken', data.accessToken);
  return data.user;
}

// GET /auth/me -> sanitized user (no passwordHash)
export async function me() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function logout() {
  // Calls the backend logout endpoint (not implemented server-side yet — kept for future use).
  // Best-effort: any failure (e.g. 404 until it's built) is ignored and we clear the token regardless.
  try {
    await api.post('/auth/logout');
  } catch {
    /* logout endpoint not implemented yet; clear the token regardless */
  }
  localStorage.removeItem('accessToken');
}

export function getToken() {
  return localStorage.getItem('accessToken');
}
