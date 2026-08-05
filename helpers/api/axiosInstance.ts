import { API_URL } from '@/contants/urls';
import axios from 'axios';

const headers: Readonly<Record<string, string | boolean>> = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Credentials": true,
  "X-Requested-With": "XMLHttpRequest",
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
};

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers
});

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('access_token');
      if (!token) {
        const stored = localStorage.getItem('user_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            token = parsed?.user?.access_token || null;
          } catch {}
        }
      }
    }
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
