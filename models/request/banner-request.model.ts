import { BaseRequest } from './base-request.model';
import { BannerTypeEnum, EntityStatusEnum } from '@/models/enums';

export interface BannerRequest extends BaseRequest {
  description: string;
  type: BannerTypeEnum;
  startDate: number[];
  endDate: number[];
  name: string;
  orderId: number;
  price: number;
  url: string;
  status: EntityStatusEnum;
}