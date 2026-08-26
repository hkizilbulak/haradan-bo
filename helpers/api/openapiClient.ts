import axios, { AxiosRequestConfig, Method } from 'axios';
import { API_ORIGIN } from '@/contants/urls';
import { dispatchUnauthorizedEvent } from './authEvents';

const apiClient = axios.create({
  baseURL: API_ORIGIN || undefined,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  },
  withCredentials: true,
});

import { getBackendBaseUrl } from './axiosInstance';

apiClient.interceptors.request.use(
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      dispatchUnauthorizedEvent();
    }
    return Promise.reject(error);
  },
);

export async function apiRequest<TResponse>(
  method: Method,
  path: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) {
  const response = await apiClient.request<TResponse>({
    method,
    url: path,
    data,
    ...config,
  });

  return response.data;
}
