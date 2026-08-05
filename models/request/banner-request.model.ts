import { BaseRequest } from './base-request.model';

export interface BannerRequest extends BaseRequest {
  assetId: string;
  placement: 'HOMEPAGE' | 'LISTING_DETAIL' | 'SEARCH';
  title?: string;
  altText?: string;
  targetUrl?: string;
  sortOrder: number;
  expectedVersion?: number;
}
