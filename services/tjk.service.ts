import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';
import { BaseService } from './base.service';

export interface TjkRunResponse extends BaseResponse {
  id: string;
  mode: string;
  status: string;
  scope: string;
  sourceAdapter: string;
  triggerKind: string;
  version: number;
  totalCount: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  skippedCount: number;
  failedCount: number;
  conflictCount: number;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelRequestedAt?: string | null;
  lastErrorSummary?: string | null;
  createdAt: string;
}

type TjkRunListResponse = {
  items?: TjkRunResponse[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

const baseUrl = `${API_URL}v1/admin/tjk/sync-runs`;

async function fetchAllRuns(status?: string): Promise<TjkRunResponse[]> {
  const items: TjkRunResponse[] = [];
  let cursor: string | undefined;
  while (true) {
    const response = await axiosInstance.get(baseUrl, { params: { cursor, limit: 100, status } });
    const data = response.data as TjkRunListResponse;
    items.push(...(data.items ?? []));
    if (!data.hasMore || !data.nextCursor) {
      return items;
    }
    cursor = data.nextCursor;
  }
}

export class TjkService extends BaseService {
  constructor() {
    super(baseUrl);
  }

  search = async <T extends BaseResponse>(params: SearchParams<T>) => {
    const content = (await fetchAllRuns(undefined)) as T[];
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

  trigger = async (mode: string, sourceAdapter: string, scope: string = 'HORSES') => {
    await axiosInstance.post(baseUrl, { mode, sourceAdapter, scope });
  };

  cancel = async (runId: string, expectedVersion: number) => {
    await axiosInstance.post(`${baseUrl}/${runId}/cancel`, { expectedVersion });
  };
}

export const tjkService = new TjkService();
