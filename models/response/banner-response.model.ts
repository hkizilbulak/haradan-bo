import { BaseResponse } from '@/models/common';

export interface BannerResponse extends BaseResponse {
  id: string;
  assetId: string;
  assetLifecycleStatus: string;
  placement: 'HOMEPAGE' | 'LISTING_DETAIL' | 'SEARCH';
  status: 'ACTIVE' | 'INACTIVE';
  title?: string | null;
  altText?: string | null;
  targetUrl?: string | null;
  sortOrder: number;
  version: number;
}
