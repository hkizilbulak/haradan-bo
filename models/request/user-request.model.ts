import { BaseRequest } from './base-request.model';

export interface UserRequest extends BaseRequest {
  expectedCurrentRole: 'admin' | 'user';
  newRole: 'admin' | 'user';
  expectedCurrentStatus: 'ACTIVE' | 'CLOSED' | 'DISABLED';
  newStatus: 'ACTIVE' | 'CLOSED' | 'DISABLED';
}
