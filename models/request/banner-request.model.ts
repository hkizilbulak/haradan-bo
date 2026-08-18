import { BaseRequest } from './base-request.model';

export interface BannerRequest extends BaseRequest {
  assetId: string;
  placement: 'HOMEPAGE' | 'HOMEPAGE_HERO' | 'HOMEPAGE_PROMO' | 'LISTING_DETAIL' | 'SEARCH';
  title?: string;
  altText?: string;
  targetUrl?: string;
  sortOrder?: number;
  expectedVersion?: number;
}
