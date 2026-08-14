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

apiClient.interceptors.request.use(
  (config) => {
    if (config.url) {
      config.url = config.url.replace(/^\/api\/api\//, '/api/');
      const proxyUrl = process.env.NEXT_PUBLIC_DEV_PROXY_URL;
      if (typeof window !== 'undefined' && proxyUrl && config.url.startsWith('/api/')) {
        config.url = proxyUrl + config.url;
      }
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
