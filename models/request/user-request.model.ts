import { BaseRequest } from './base-request.model';
import { UserRole } from '../response/session-response.model';

export interface UserRequest extends BaseRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  expectedUpdatedAt?: string;
  expectedCurrentRole: UserRole;
  newRole: UserRole;
  expectedCurrentStatus: 'ACTIVE' | 'CLOSED' | 'DISABLED';
  newStatus: 'ACTIVE' | 'CLOSED' | 'DISABLED';
}
