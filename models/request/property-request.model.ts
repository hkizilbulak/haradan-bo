import { BaseRequest } from './base-request.model';
import { ILookup } from '../common/lookup.model';
import { EntityStatusEnum, PropertyTypeEnum } from '@/models/enums';

export interface PropertyRequest extends BaseRequest {
  categoryId: string;
  lookupData?: ILookup[];
  mandatory: boolean;
  name: string;
  orderId: number;
  parentId: string;
  searchParam: boolean;
  searchText?: string;
  type: PropertyTypeEnum;
  status: EntityStatusEnum;
}