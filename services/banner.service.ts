import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';
import { BannerRequest } from '@/models/request/banner-request.model';
import { BannerResponse } from '@/models/response/banner-response.model';
import { BaseService } from './base.service';

type AdminBannerListResponse = {
  items?: BannerResponse[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type BannerFilterParams = {
  placement?: string;
  status?: string;
};

const baseUrl = `${API_URL}v1/admin/banners`;

function parseFilter(filter?: string): BannerFilterParams {
  if (!filter) {
    return {};
  }

  return filter.split(';').reduce<BannerFilterParams>((acc, token) => {
    const [key, value] = token.split('==');
    if (!key || !value) {
      return acc;
    }

    if (key === 'placement') {
      acc.placement = value;
    }
    if (key === 'status') {
      acc.status = value;
    }

    return acc;
  }, {});
}

async function fetchAllBanners(params: BannerFilterParams): Promise<BannerResponse[]> {
  const items: BannerResponse[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await axiosInstance.get(baseUrl, {
      params: {
        cursor,
        limit: 100,
        placement: params.placement,
        status: params.status,
      },
    });

    const data = response.data as AdminBannerListResponse;
    items.push(...(data.items ?? []));

    if (!data.hasMore || !data.nextCursor) {
      return items;
    }

    cursor = data.nextCursor;
  }
}

export class BannerService extends BaseService {
  constructor() {
    super(baseUrl);
  }

  search = async <T extends BaseResponse>(params: SearchParams<T>) => {
    const filters = parseFilter(params.filter);
    const allItems = await fetchAllBanners(filters);
    const page = params.pageRequest.page ?? 0;
    const size = params.pageRequest.size ?? 10;
    const start = page * size;
    const content = allItems.slice(start, start + size) as T[];

    return {
      content,
      page: {
        size,
        totalElements: allItems.length,
        totalPages: Math.max(1, Math.ceil(allItems.length / size)),
        number: page,
      },
    } satisfies PagedResponse<T>;
  };

  create = async (request: BannerRequest) => {
    await axiosInstance.post(baseUrl, {
      placement: request.placement,
      assetId: request.assetId,
      title: request.title || undefined,
      altText: request.altText || undefined,
      targetUrl: request.targetUrl || undefined,
      sortOrder: request.sortOrder,
    });
  };

  update = async (request: BannerRequest) => {
    if (!request.identifier) {
      throw new Error('Banner identifier is required for updates');
    }

    await axiosInstance.patch(`${baseUrl}/${request.identifier}`, {
      expectedVersion: request.expectedVersion,
      assetId: request.assetId,
      title: request.title || undefined,
      altText: request.altText || undefined,
      targetUrl: request.targetUrl || undefined,
      sortOrder: request.sortOrder,
    });
  };

  setStatus = async (request: BannerRequest, status: 'ACTIVE' | 'INACTIVE') => {
    if (!request.identifier) {
      throw new Error('Banner identifier is required for status updates');
    }

    await axiosInstance.post(`${baseUrl}/${request.identifier}/status`, {
      expectedVersion: request.expectedVersion,
      status,
    });
  };
}

export const bannerService = new BannerService();
