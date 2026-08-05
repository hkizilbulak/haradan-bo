import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';
import { BaseService } from './base.service';

export interface PackageResponse extends BaseResponse {
  code: string;
  displayName: string;
  description?: string | null;
  badgeText?: string | null;
  benefits: string[];
  displayPrice?: { amountMinor: number; currency: string } | null;
  currencyCode: string;
  defaultDurationDays?: number | null;
  allowsUrgent: boolean;
  showcaseEligible: boolean;
  searchPriority: number;
  broadcastOnPublish: boolean;
  isActive: boolean;
  sortOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackageRequest {
  identifier?: string;
  expectedVersion?: number;
  code?: string;
  displayName: string;
  description?: string;
  badgeText?: string;
  benefitsText: string;
  amountMinor?: number;
  currencyCode: string;
  defaultDurationDays?: number | null;
  allowsUrgent: boolean;
  showcaseEligible: boolean;
  searchPriority: number;
  broadcastOnPublish: boolean;
  isActive: boolean;
  sortOrder: number;
}

type PackageAdminListResponse = {
  items?: PackageResponse[];
};

const baseUrl = `${API_URL}v1/admin/packages`;

function toBenefits(text: string) {
  return text
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function toNumber(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

export class PackageService extends BaseService {
  constructor() {
    super(baseUrl);
  }

  search = async <T extends BaseResponse>(params: SearchParams<T>) => {
    const response = await axiosInstance.get(baseUrl);
    const data = response.data as PackageAdminListResponse;
    const content = (data.items ?? []) as T[];
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

  create = async (request: PackageRequest) => {
    await axiosInstance.post(baseUrl, {
      code: request.code,
      displayName: request.displayName,
      description: request.description || undefined,
      badgeText: request.badgeText || undefined,
      benefits: toBenefits(request.benefitsText),
      displayPrice: request.amountMinor === undefined || request.amountMinor === null
        ? undefined
        : { amountMinor: Number(request.amountMinor), currency: request.currencyCode },
      currencyCode: request.currencyCode,
      defaultDurationDays: toNumber(request.defaultDurationDays),
      allowsUrgent: request.allowsUrgent,
      showcaseEligible: request.showcaseEligible,
      searchPriority: Number(request.searchPriority),
      broadcastOnPublish: request.broadcastOnPublish,
      isActive: request.isActive,
      sortOrder: Number(request.sortOrder),
    });
  };

  update = async (request: PackageRequest) => {
    if (!request.code) {
      throw new Error('Package code is required for updates');
    }

    await axiosInstance.patch(`${baseUrl}/${request.code}`, {
      expectedVersion: request.expectedVersion,
      displayName: request.displayName,
      description: request.description || undefined,
      badgeText: request.badgeText || undefined,
      benefits: toBenefits(request.benefitsText),
      displayPrice: request.amountMinor === undefined || request.amountMinor === null
        ? undefined
        : { amountMinor: Number(request.amountMinor), currency: request.currencyCode },
      currencyCode: request.currencyCode,
      defaultDurationDays: toNumber(request.defaultDurationDays),
      allowsUrgent: request.allowsUrgent,
      showcaseEligible: request.showcaseEligible,
      searchPriority: Number(request.searchPriority),
      broadcastOnPublish: request.broadcastOnPublish,
      isActive: request.isActive,
      sortOrder: Number(request.sortOrder),
    });
  };
}

export const packageService = new PackageService();
