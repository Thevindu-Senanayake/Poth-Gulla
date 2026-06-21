import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set this to your active localtunnel URL + /api, e.g. https://your-subdomain.loca.lt/api
export const API_BASE_URL = 'https://YOUR-TUNNEL.loca.lt/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync('accessToken');
        }
        return Promise.reject(error);
    }
);
