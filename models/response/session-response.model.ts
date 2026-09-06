export type UserRole = 'admin' | 'user' | 'CALL_CENTER';

export interface SessionUserResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  status: 'ACTIVE' | 'CLOSED' | 'DISABLED';
}

export interface SessionResponse {
  user: SessionUserResponse;
}
