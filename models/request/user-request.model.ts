import { BaseRequest } from './base-request.model';
import { ChannelTypeEnum, EntityStatusEnum } from '@/models/enums';

export interface UserRequest extends BaseRequest {
  admin: string;
  channel: ChannelTypeEnum;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber: string;
  status: EntityStatusEnum;
}