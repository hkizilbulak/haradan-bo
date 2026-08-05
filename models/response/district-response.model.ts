import { BaseResponse } from '@/models/common';
import { CityResponse } from '..';

export interface DistrictResponse extends BaseResponse {
  name: string,
  city: CityResponse,
  districtCode: string,
}