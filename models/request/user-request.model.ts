import { BaseRequest } from './base-request.model';

export interface UserRequest extends BaseRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  expectedUpdatedAt?: string;
  expectedCurrentRole: 'admin' | 'user';
  newRole: 'admin' | 'user';
  expectedCurrentStatus: 'ACTIVE' | 'CLOSED' | 'DISABLED';
  newStatus: 'ACTIVE' | 'CLOSED' | 'DISABLED';
}
