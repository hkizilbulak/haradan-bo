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
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  status: ModerationAdvertStatus;
  version?: number;
  categoryId?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
  properties?: Record<string, any>;
  mediaVersion?: number;
  rejectionReason?: string | null;
  price?: { amountMinor?: number; amount?: number; currency?: string } | null;
  districtId?: string | number | null;
  provinceId?: string | number | null;
  provinceName?: string | null;
  districtName?: string | null;
  locationName?: string | null;
  location?: { districtId?: string; districtName?: string; provinceId?: string; provinceName?: string; name?: string } | null;
  sellerPhone?: string | null;
}

