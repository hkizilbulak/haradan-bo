import { BaseResponse } from '@/models/common';
import { ChannelTypeEnum, EntityStatusEnum } from '@/models/enums';

export interface UserResponse extends BaseResponse {
  admin: boolean;
  channel: ChannelTypeEnum;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber: string;
  status: EntityStatusEnum;
}