export interface SessionUserResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: 'admin' | 'user';
  status: 'ACTIVE' | 'CLOSED' | 'DISABLED';
}

export interface SessionResponse {
  user: SessionUserResponse;
}
