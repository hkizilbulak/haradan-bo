import { BaseResponse } from '@/models/common';
import { BannerTypeEnum, EntityStatusEnum } from '@/models/enums';

export interface BannerResponse extends BaseResponse {
  description: string;
  type: BannerTypeEnum;
  startDate: number[];
  endDate: number[];
  name: string;
  orderId: number;
  price: number;
  searchText: string;
  status: EntityStatusEnum;
  url: string;
}