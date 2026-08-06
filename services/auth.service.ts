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

async function getSession() {
  const response = await authClient.get<SessionResponse>('/api/session');
  return response.data;
}

async function login(email: string, password: string) {
  const request: AuthLoginRequest = {
    email,
    password,
    clientContext: 'ADMIN_BO',
  };

  const response = await authClient.post<SessionResponse>('/api/session/login', request);
  return response.data;
}

async function logout() {
  await authClient.post('/api/session/logout');
}
