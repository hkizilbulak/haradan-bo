import axios, { AxiosRequestConfig, Method } from 'axios';
import { API_ORIGIN } from '@/contants/urls';
import { clearStoredAuthSession, readStoredAccessToken } from './token';

const apiClient = axios.create({
  baseURL: API_ORIGIN,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = readStoredAccessToken();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredAuthSession();
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
