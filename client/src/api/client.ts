import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Set this to your active localtunnel URL + /api, e.g. https://your-subdomain.loca.lt/api
export const API_BASE_URL = "https://YOUR-TUNNEL.loca.lt/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Bypass-Tunnel-Reminder": "true" },
});

// Registered by AuthContext so the interceptor can clear user state without a circular import.
let _forceLogout: (() => void) | null = null;
export function setForceLogoutHandler(fn: () => void) {
  _forceLogout = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Only force logout when a Bearer token was sent and the server rejected it.
    // This avoids triggering on 401s from the login endpoint itself (invalid credentials).
    if (
      error.response?.status === 401 &&
      error.config?.headers?.Authorization
    ) {
      await SecureStore.deleteItemAsync("accessToken");
      _forceLogout?.();
    }
    return Promise.reject(error);
  },
);
