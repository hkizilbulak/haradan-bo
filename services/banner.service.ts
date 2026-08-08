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
    const limit = params.pageRequest.size ?? 10;
    const cursorMode = params.cursor !== undefined || params.pageRequest.page !== undefined;

    // Cursor page mode (opaque cursor from caller)
    if (cursorMode && params.cursor !== undefined) {
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
          number: params.pageRequest.page ?? 0,
          totalElements: content.length,
          totalPages: data.hasMore ? (params.pageRequest.page ?? 0) + 2 : (params.pageRequest.page ?? 0) + 1,
          hasMore: Boolean(data.hasMore),
          nextCursor: data.nextCursor ?? null,
          cursorMode: true,
        },
      };
    }

    // Legacy: fetch all then slice (fallback)
    const allItems = await this.fetchAll(filters);
    const page = params.pageRequest.page ?? 0;
    const size = params.pageRequest.size ?? 10;
    const start = page * size;
    const content = allItems.slice(start, start + size);

    return {
      content,
      page: {
        size,
        totalElements: allItems.length,
        totalPages: Math.max(1, Math.ceil(allItems.length / size)),
        number: page,
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
    placement: 'HOMEPAGE' | 'LISTING_DETAIL' | 'SEARCH',
    items: BannerReorderItem[],
  ) => {
    await axiosInstance.put(`${baseUrl}/reorder`, {
      placement,
      items,
    });
  };
}

export const bannerService = new BannerService();
