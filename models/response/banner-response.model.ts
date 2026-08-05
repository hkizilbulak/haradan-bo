import { BaseResponse } from '@/models/common';

export interface BannerResponse extends BaseResponse {
  assetId: string;
  assetLifecycleStatus: string;
  placement: 'HOMEPAGE' | 'LISTING_DETAIL' | 'SEARCH';
  status: 'ACTIVE' | 'INACTIVE';
  title?: string;
  altText?: string;
  targetUrl?: string;
  sortOrder: number;
  imageUrl?: string;
  version: number;
}
