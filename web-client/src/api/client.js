import axios from 'axios';

// Base URL of the NestJS API. Override with VITE_API_URL in a .env file.
// The backend mounts everything under the global prefix `/api` (see server/src/main.ts).
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({ baseURL: API_BASE_URL });

// Attach the JWT on every request (same storage key the backend dev's web-client uses).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Force a logout only when a Bearer token was sent and the server rejected it (401).
// This avoids reacting to 401s from the login endpoint itself (invalid credentials).
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      localStorage.removeItem('accessToken');
      window.dispatchEvent(new CustomEvent('auth:force-logout'));
    }
    return Promise.reject(error);
  }
);
