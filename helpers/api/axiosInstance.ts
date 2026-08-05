import { API_URL } from '@/contants/urls';
import axios from 'axios';
import { readStoredAccessToken } from './token';

const headers: Readonly<Record<string, string | boolean>> = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=utf-8",
  "X-Requested-With": "XMLHttpRequest",
};

const axiosInstance = axios.create({
  baseURL: API_URL.replace(/\/$/, ''),
  headers
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = readStoredAccessToken();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
