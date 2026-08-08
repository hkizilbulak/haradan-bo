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
  id?: string;
  title?: string | null;
  publishedAt?: string | null;
  deletedAt?: string | null;
  status: ModerationAdvertStatus;
  version?: number;
  categoryId?: string | null;
  ownerUserId?: string | null;
  mediaVersion?: number;
}
