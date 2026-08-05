import { BaseRequest } from './base-request.model';
import { EntityStatusEnum } from '@/models/enums';

export interface CategoryRequest extends BaseRequest {
  expectedVersion?: number,
  name: string,
  slug: string,
  sortOrder?: number,
  description?: string,
  parentId?: string,
  status: EntityStatusEnum,
}