import axios from 'axios';
import { AuthLoginRequest, SessionResponse } from '@/models';

export const authService = {
  getSession,
  login,
  logout,
};

const authClient = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  },
  withCredentials: true,
});

function getDevUrl(path: string) {
  // Only rewrite in Next.js hot-reload mode when an explicit proxy URL is configured.
  // Static BO runtime on :3001 must keep same-origin `/api/*` so Go can proxy to BE.
  const proxyUrl = process.env.NEXT_PUBLIC_DEV_PROXY_URL;
  if (typeof window !== 'undefined' && proxyUrl) {
    return proxyUrl + path;
  }
  return path;
}

async function getSession() {
  const response = await authClient.get<SessionResponse>(getDevUrl('/api/session'));
  return response.data;
}

async function login(email: string, password: string) {
  const request: AuthLoginRequest = {
    email,
    password,
    clientContext: 'ADMIN_BO',
  };

  const response = await authClient.post<SessionResponse>(getDevUrl('/api/session/login'), request);
  return response.data;
}

async function logout() {
  await authClient.post(getDevUrl('/api/session/logout'));
}
