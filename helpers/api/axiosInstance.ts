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

axiosInstance.interceptors.request.use(
  async (config) => {
    if (config.url) {
      config.url = config.url.replace(/^\/api\/api\//, '/api/');
      if (typeof window !== 'undefined' && window.location.port === '3000') {
        if (config.url.startsWith('/api/')) {
          config.url = (process.env.NEXT_PUBLIC_DEV_PROXY_URL || 'http://localhost:8080') + config.url;
        }
      }
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
