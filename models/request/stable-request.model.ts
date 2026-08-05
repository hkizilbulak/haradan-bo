import { BaseResponse } from '@/models/common';
import { BaseRequest } from './base-request.model';


export interface StableRequest extends BaseRequest {
  name: string;
  phoneNumber: string;
  email: string;
  webpage: string;
  contactName: string;
  address: string;
  note: string;
}