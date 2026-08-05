import { BaseRequest } from './base-request.model';
import { EntityStatusEnum } from '@/models/enums';

export interface CategoryRequest extends BaseRequest {
  name: string,
  orderId?: number,
  parentId?: string,
  price: number,
  status: EntityStatusEnum,
}