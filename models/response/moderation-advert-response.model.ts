import { BaseResponse } from '@/models/common';
import { EntityStatusEnum } from '@/models/enums';

export interface ModerationAdvertResponse extends BaseResponse {
  title?: string;
  publishedAt?: string;
  deletedAt?: string;
  status: EntityStatusEnum;
  version?: number;
  categoryId?: string;
  ownerUserId?: string;
}
