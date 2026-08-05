import { BaseResponse } from '@/models/common';
import { EntityStatusEnum } from '@/models/enums';

export interface ContactResponse extends BaseResponse {
  name: string;
  message: string;
  email: string;
  phoneNumber: string;
  status: EntityStatusEnum;
}