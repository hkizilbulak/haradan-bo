import { BaseRequest } from './base-request.model';

export interface CityRequest extends BaseRequest {
  name: string,
  cityCode: string,
  countryCode: string,
}