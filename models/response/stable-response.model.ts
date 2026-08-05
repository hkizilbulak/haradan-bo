import { BaseResponse } from '@/models/common';

export interface StableResponse extends BaseResponse {
  name: string;
  phoneNumber: number;
  email: string;
  webpage: string;
  contactName: string;
  address: string;
  note: string;
}