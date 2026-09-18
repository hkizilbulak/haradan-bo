import axiosInstance from '@/helpers/api/axiosInstance';
import { withIdentifiers } from '@/helpers/api/mapIdentifier';
import { API_URL } from '@/contants/urls';
import { PagedResponse, SearchParams } from '@/models/common';
import { BannerRequest } from '@/models/request/banner-request.model';
import { BannerResponse } from '@/models/response/banner-response.model';

type AdminBannerItem = Omit<BannerResponse, 'identifier'> & { id: string };

type AdminBannerListResponse = {
  items?: AdminBannerItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type BannerFilterParams = {
  placement?: string;
  status?: string;
};

export type BannerReorderItem = {
  id: string;
  expectedVersion: number;
  sortOrder: number;
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

export class BannerService {
  search = async (params: SearchParams<BannerResponse>): Promise<PagedResponse<BannerResponse>> => {
    const filters = parseFilter(params.filter);
    const limit = params.pageRequest?.size ?? 10;
    const page = params.pageRequest?.page ?? 0;

    const response = await axiosInstance.get(baseUrl, {
      params: {
        cursor: params.cursor || undefined,
        limit,
        placement: filters.placement,
        status: filters.status,
      },
    });
    const data = response.data as AdminBannerListResponse;
    const content = withIdentifiers(data.items ?? []);
    return {
      content,
      page: {
        size: limit,
        number: page,
        totalElements: content.length,
        totalPages: data.hasMore ? page + 2 : page + 1,
        hasMore: Boolean(data.hasMore),
        nextCursor: data.nextCursor ?? null,
        cursorMode: true,
      },
    };
  };

  /**
   * Fetches every banner for the given filters by walking opaque cursors.
   * Used for placement-scoped reorder so the full order is sent to ReorderBanners.
   */
  fetchAll = async (params: BannerFilterParams = {}): Promise<BannerResponse[]> => {
    const items: AdminBannerItem[] = [];
    let cursor: string | undefined;
    const seenCursors = new Set<string>();

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
        return withIdentifiers(items);
      }

      if (seenCursors.has(data.nextCursor)) {
        throw new Error('Banner listesi cursor döngüsü algılandı.');
      }
      seenCursors.add(data.nextCursor);
      cursor = data.nextCursor;
    }
  };

  create = async (request: BannerRequest) => {
    await axiosInstance.post(baseUrl, {
      placement: request.placement,
      assetId: request.assetId,
      title: request.title || undefined,
      altText: request.altText || undefined,
      targetUrl: request.targetUrl || undefined,
      // omit sortOrder on create → backend appends to end of placement
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

  reorder = async (
    placement: 'HOMEPAGE_HERO' | 'HOMEPAGE_PROMO' | 'HOMEPAGE' | 'LISTING_DETAIL' | 'SEARCH',
    items: BannerReorderItem[],
  ) => {
    await axiosInstance.put(`${baseUrl}/reorder`, {
      placement,
      items,
    });
  };

  delete = async (bannerId: string): Promise<void> => {
    await axiosInstance.delete(`${baseUrl}/${bannerId}`);
  };
}

export const bannerService = new BannerService();
