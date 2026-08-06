import { BaseResponse } from '@/models/common';

export type ModerationAdvertStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'SOLD'
  | 'ARCHIVED';

export interface ModerationAdvertResponse extends BaseResponse {
  title?: string;
  publishedAt?: string;
  deletedAt?: string;
  status: ModerationAdvertStatus;
  version?: number;
  categoryId?: string;
  ownerUserId?: string;
}
