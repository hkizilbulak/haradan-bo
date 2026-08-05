import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';
import { BaseService } from './base.service';

export interface CampaignResponse extends BaseResponse {
  id: string;
  code: string;
  name: string;
  eventType: string;
  sourcePackageCode?: string | null;
  targetPackageCode?: string | null;
  title: string;
  description?: string | null;
  emailSubject?: string | null;
  emailHeading?: string | null;
  emailBody?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  badgeText?: string | null;
  imageAssetId?: string | null;
  originalPrice?: { amountMinor: number; currency: string } | null;
  campaignPrice?: { amountMinor: number; currency: string } | null;
  currencyCode: string;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRequest {
  identifier?: string;
  expectedVersion?: number;
  code?: string;
  name: string;
  eventType: string;
  sourcePackageCode?: string;
  targetPackageCode?: string;
  title: string;
  description?: string;
  emailSubject?: string;
  emailHeading?: string;
  emailBody?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  badgeText?: string;
  imageAssetId?: string;
  originalAmountMinor?: number;
  campaignAmountMinor?: number;
  currencyCode: string;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}

type CampaignPageResponse = {
  items?: CampaignResponse[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

const baseUrl = `${API_URL}v1/admin/campaigns`;

async function fetchAllCampaigns(): Promise<CampaignResponse[]> {
  const items: CampaignResponse[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await axiosInstance.get(baseUrl, { params: { cursor, limit: 100 } });
    const data = response.data as CampaignPageResponse;
    items.push(...(data.items ?? []));
    if (!data.hasMore || !data.nextCursor) {
      return items;
    }
    cursor = data.nextCursor;
  }
}

export class CampaignService extends BaseService {
  constructor() {
    super(baseUrl);
  }

  search = async <T extends BaseResponse>(params: SearchParams<T>) => {
    const content = (await fetchAllCampaigns()) as T[];
    return {
      content,
      page: {
        size: content.length,
        totalElements: content.length,
        totalPages: 1,
        number: 0,
      },
    } satisfies PagedResponse<T>;
  };

  create = async (request: CampaignRequest) => {
    await axiosInstance.post(baseUrl, this.toPayload(request));
  };

  update = async (request: CampaignRequest) => {
    if (!request.identifier) {
      throw new Error('Campaign identifier is required for updates');
    }

    await axiosInstance.patch(`${baseUrl}/${request.identifier}`, {
      expectedVersion: request.expectedVersion,
      ...this.toPayload(request),
    });
  };

  private toPayload(request: CampaignRequest) {
    return {
      code: request.code,
      name: request.name,
      eventType: request.eventType,
      sourcePackageCode: request.sourcePackageCode || undefined,
      targetPackageCode: request.targetPackageCode || undefined,
      title: request.title,
      description: request.description || undefined,
      emailSubject: request.emailSubject || undefined,
      emailHeading: request.emailHeading || undefined,
      emailBody: request.emailBody || undefined,
      ctaLabel: request.ctaLabel || undefined,
      ctaUrl: request.ctaUrl || undefined,
      badgeText: request.badgeText || undefined,
      imageAssetId: request.imageAssetId || undefined,
      originalPrice: request.originalAmountMinor === undefined || request.originalAmountMinor === null
        ? undefined
        : { amountMinor: Number(request.originalAmountMinor), currency: request.currencyCode },
      campaignPrice: request.campaignAmountMinor === undefined || request.campaignAmountMinor === null
        ? undefined
        : { amountMinor: Number(request.campaignAmountMinor), currency: request.currencyCode },
      currencyCode: request.currencyCode,
      startsAt: request.startsAt,
      endsAt: request.endsAt || undefined,
      isActive: request.isActive,
    };
  }
}

export const campaignService = new CampaignService();
