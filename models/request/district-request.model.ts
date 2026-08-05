import { BaseRequest } from "./base-request.model";

export interface DistrictRequest extends BaseRequest {
  name: string,
  cityId: string,
  districtCode: string,
}