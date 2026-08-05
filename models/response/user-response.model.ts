import { BaseResponse } from '@/models/common';

export interface UserResponse extends BaseResponse {
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  status: 'ACTIVE' | 'CLOSED' | 'DISABLED';
  phone?: string;
  activeSessionCount?: number;
}
