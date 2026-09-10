import { BaseResponse } from '@/models/common';
import { UserRole } from './session-response.model';

export interface UserResponse extends BaseResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: 'ACTIVE' | 'CLOSED' | 'DISABLED';
  phone?: string | null;
  activeSessionCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UserConsentLog {
  id: string;
  agreementType: string;
  version: string;
  isGranted: boolean;
  ipAddress: string;
  channel: string;
  createdAt: string;
}
