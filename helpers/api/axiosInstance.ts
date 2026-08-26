import { API_URL } from '@/contants/urls';
import axios from 'axios';
import { dispatchUnauthorizedEvent } from './authEvents';

const headers: Readonly<Record<string, string | boolean>> = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=utf-8",
  "X-Requested-With": "XMLHttpRequest",
};

const axiosInstance = axios.create({
  headers,
  withCredentials: true,
});

export function getBackendBaseUrl(): string {
  const custom =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_DEV_PROXY_URL ||
    process.env.BACKEND_API_URL;
  if (custom) {
    return custom.replace(/\/+$/, '');
  }
  return 'https://haradan-be-production.up.railway.app';
}

axiosInstance.interceptors.request.use(
  async (config) => {
    if (config.url) {
      config.url = config.url.replace(/^\/api\/api\//, '/api/');
      const base = getBackendBaseUrl();
      if (config.url.startsWith('/api/')) {
        config.url = base + config.url;
      } else if (!/^https?:\/\//i.test(config.url)) {
        config.url = base + (config.url.startsWith('/') ? '' : '/') + config.url;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const token =
          localStorage.getItem('token') ||
          localStorage.getItem('accessToken') ||
          localStorage.getItem('auth_token') ||
          localStorage.getItem('haradan_admin_token') ||
          sessionStorage.getItem('token') ||
          sessionStorage.getItem('accessToken');
        if (token && config.headers && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {}
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      dispatchUnauthorizedEvent();
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;

