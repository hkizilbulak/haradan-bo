import axiosInstance from '@/helpers/api/axiosInstance';
import { toApiDateTime } from '@/helpers/DateUtils';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';

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
  emailProviderTemplateId?: string | null;
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
  emailProviderTemplateId?: string;
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
  const seenCursors = new Set<string>();

  while (true) {
    const response = await axiosInstance.get(baseUrl, { params: { cursor, limit: 100 } });
    const data = response.data as CampaignPageResponse;
    items.push(...(data.items ?? []));
    if (!data.hasMore || !data.nextCursor) {
      return items;
    }
    if (seenCursors.has(data.nextCursor)) {
      throw new Error('Kampanya listesi cursor döngüsü algılandı.');
    }
    seenCursors.add(data.nextCursor);
    cursor = data.nextCursor;
  }
}

function moneyPayload(amountMinor: number | undefined, currency: string) {
  if (amountMinor === undefined || amountMinor === null) {
    return undefined;
  }
  return { amountMinor: Number(amountMinor), currency };
}

function sharedFields(request: CampaignRequest) {
  return {
    name: request.name,
    eventType: request.eventType,
    sourcePackageCode: request.sourcePackageCode || undefined,
    targetPackageCode: request.targetPackageCode || undefined,
    title: request.title,
    description: request.description || undefined,
    emailSubject: request.emailSubject || undefined,
    emailHeading: request.emailHeading || undefined,
    emailBody: request.emailBody || undefined,
    emailProviderTemplateId: request.emailProviderTemplateId || undefined,
    ctaLabel: request.ctaLabel || undefined,
    ctaUrl: request.ctaUrl || undefined,
    badgeText: request.badgeText || undefined,
    imageAssetId: request.imageAssetId || undefined,
    originalPrice: moneyPayload(request.originalAmountMinor, request.currencyCode),
    campaignPrice: moneyPayload(request.campaignAmountMinor, request.currencyCode),
    currencyCode: request.currencyCode,
    startsAt: toApiDateTime(request.startsAt),
    endsAt: toApiDateTime(request.endsAt),
    isActive: request.isActive,
  };
}

export class CampaignService {
  search = async (params: SearchParams<CampaignResponse>): Promise<PagedResponse<CampaignResponse>> => {
    const limit = params.pageRequest.size ?? 10;

    if (params.cursor !== undefined) {
      const response = await axiosInstance.get(baseUrl, {
        params: {
          cursor: params.cursor || undefined,
          limit,
        },
      });
      const data = response.data as CampaignPageResponse;
      const content = data.items ?? [];
      const pageNumber = params.pageRequest.page ?? 0;
      return {
        content,
        page: {
          size: limit,
          number: pageNumber,
          totalElements: content.length,
          totalPages: data.hasMore ? pageNumber + 2 : pageNumber + 1,
          hasMore: Boolean(data.hasMore),
          nextCursor: data.nextCursor ?? null,
          cursorMode: true,
        },
      };
    }

    const content = await fetchAllCampaigns();
    return {
      content,
      page: {
        size: content.length,
        totalElements: content.length,
        totalPages: 1,
        number: 0,
      },
    };
  };

  getById = async (campaignId: string): Promise<CampaignResponse> => {
    const response = await axiosInstance.get(`${baseUrl}/${campaignId}`);
    return response.data as CampaignResponse;
  };

  create = async (request: CampaignRequest) => {
    const body: Record<string, unknown> = {
      ...sharedFields(request),
    };
    const code = request.code?.trim();
    if (code) {
      body.code = code;
    }
    await axiosInstance.post(baseUrl, body);
  };

  update = async (request: CampaignRequest) => {
    if (!request.identifier) {
      throw new Error('Campaign identifier is required for updates');
    }

    // UpdateAdminCampaign — code is immutable / not in schema (unknown key → 400)
    await axiosInstance.patch(`${baseUrl}/${request.identifier}`, {
      expectedVersion: request.expectedVersion,
      ...sharedFields(request),
    });
  };
}

export const campaignService = new CampaignService();
