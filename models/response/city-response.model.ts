import { BaseResponse } from '@/models/common';

export interface CityResponse extends BaseResponse {
  name: string,
  cityCode: string,
  countryCode: string,
}