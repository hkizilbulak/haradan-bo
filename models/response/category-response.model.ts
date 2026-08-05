import { BaseResponse } from '@/models/common';
import { EntityStatusEnum } from '../enums/entity-status.enum';

export interface CategoryResponse extends BaseResponse {
  name: string,
  orderId: number,
  parentId: string,
  price: number,
  searchText: string,
  status: EntityStatusEnum,
  children: CategoryResponse[]
}