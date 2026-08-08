import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';

export interface PackageResponse extends BaseResponse {
  id?: string;
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
  benefits: string[];
  amountMinor?: number;
  defaultDurationDays?: number | null;
  allowsUrgent: boolean;
  showcaseEligible: boolean;
  searchPriority: number;
  broadcastOnPublish: boolean;
  isActive: boolean;
}

type PackageAdminListResponse = {
  items?: PackageResponse[];
};

const baseUrl = `${API_URL}v1/admin/packages`;

function toNumber(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return Number(value);
}

export class PackageService {
  search = async (_params: SearchParams<PackageResponse>): Promise<PagedResponse<PackageResponse>> => {
    const response = await axiosInstance.get(baseUrl);
    const data = response.data as PackageAdminListResponse;
    const content = (data.items ?? []).slice().sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.code.localeCompare(b.code);
    });
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

  create = async (request: PackageRequest) => {
    await axiosInstance.post(baseUrl, {
      displayName: request.displayName,
      description: request.description || undefined,
      badgeText: request.badgeText || undefined,
      benefits: request.benefits.filter((item) => item.trim()),
      displayPrice: request.amountMinor === undefined || request.amountMinor === null
        ? undefined
        : { amountMinor: Number(request.amountMinor), currency: 'TRY' },
      currencyCode: 'TRY',
      defaultDurationDays: toNumber(request.defaultDurationDays),
      allowsUrgent: request.allowsUrgent,
      showcaseEligible: request.showcaseEligible,
      searchPriority: Number(request.searchPriority ?? 0),
      broadcastOnPublish: request.broadcastOnPublish,
      isActive: request.isActive,
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
      benefits: request.benefits.filter((item) => item.trim()),
      displayPrice: request.amountMinor === undefined || request.amountMinor === null
        ? undefined
        : { amountMinor: Number(request.amountMinor), currency: 'TRY' },
      currencyCode: 'TRY',
      defaultDurationDays: toNumber(request.defaultDurationDays),
      allowsUrgent: request.allowsUrgent,
      showcaseEligible: request.showcaseEligible,
      searchPriority: Number(request.searchPriority ?? 0),
      broadcastOnPublish: request.broadcastOnPublish,
      isActive: request.isActive,
    });
  };

  reorder = async (items: Array<{ id: string; expectedVersion: number; sortOrder: number }>) => {
    await axiosInstance.put(`${baseUrl}/reorder`, { items });
  };
}

export const packageService = new PackageService();
