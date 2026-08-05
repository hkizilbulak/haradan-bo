import { BaseResponse } from '@/models/common';
import { ILookup } from '../common/lookup.model';
import { EntityStatusEnum, PropertyTypeEnum } from '@/models/enums';

export interface PropertyResponse extends BaseResponse {
  categoryId: string;
  lookupData: ILookup[];
  mandatory: boolean;
  name: string;
  orderId: number;
  parentId: string;
  searchParam: boolean;
  searchText: string;
  type: PropertyTypeEnum;
  status: EntityStatusEnum;
}