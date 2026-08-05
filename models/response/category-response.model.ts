import { BaseResponse } from '@/models/common';
import { EntityStatusEnum } from '../enums/entity-status.enum';

export interface CategoryResponse extends BaseResponse {
  name: string;
  slug: string;
  sortOrder: number;
  description?: string;
  parentId?: string;
  status: EntityStatusEnum;
  version?: number;
  children: CategoryResponse[];
}