import { BaseResponse } from '@/models/common';

export interface UserResponse extends BaseResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  status: 'ACTIVE' | 'CLOSED' | 'DISABLED';
  phone?: string | null;
  activeSessionCount?: number;
  createdAt: string;
  updatedAt?: string;
}
