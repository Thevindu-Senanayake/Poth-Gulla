import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        // Only force logout when a Bearer token was sent and the server rejected it.
        // This avoids triggering on 401s from the login endpoint itself (invalid credentials).
        if (error.response?.status === 401 && error.config?.headers?.Authorization) {
            localStorage.removeItem('accessToken');
            window.dispatchEvent(new CustomEvent('auth:force-logout'));
        }
        return Promise.reject(error);
    }
);
