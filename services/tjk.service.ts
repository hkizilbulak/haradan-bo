import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';

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

export interface TjkItemError {
  id: string;
  runId: string;
  tjkNumber?: string | null;
  horseId?: string | null;
  errorClass: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  message: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export type TjkItemErrorListResponse = {
  items: TjkItemError[];
  nextCursor?: string | null;
  hasMore: boolean;
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

export class TjkService {
  search = async (_params: SearchParams<TjkRunResponse>): Promise<PagedResponse<TjkRunResponse>> => {
    const content = await fetchAllRuns(undefined);
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

  trigger = async (mode: string, sourceAdapter: string, scope: string = 'HORSES') => {
    try {
      const response = await axiosInstance.post(baseUrl, { mode, sourceAdapter, scope });
      return response.data;
    } catch (error) {
      console.error("TJK trigger error:", error);
      throw error;
    }
  };

  cancel = async (runId: string, expectedVersion: number) => {
    try {
      const response = await axiosInstance.post(`${baseUrl}/${runId}/cancel`, { expectedVersion });
      return response.data;
    } catch (error) {
      console.error("TJK cancel error:", error);
      throw error;
    }
  };

  getItemErrors = async (runId: string): Promise<TjkItemError[]> => {
    const items: TjkItemError[] = [];
    let cursor: string | undefined;
    while (true) {
      const response = await axiosInstance.get(`${baseUrl}/${runId}/item-errors`, {
        params: { cursor, limit: 50 },
      });
      const data = response.data as TjkItemErrorListResponse;
      items.push(...data.items);
      if (!data.hasMore || !data.nextCursor) {
        return items;
      }
      cursor = data.nextCursor;
    }
  };

  ignoreError = async (errorId: string) => {
    const response = await axiosInstance.post(`${API_URL}v1/admin/tjk/item-errors/${errorId}/ignore`);
    return response.data;
  };

  resolveError = async (errorId: string) => {
    const response = await axiosInstance.post(`${API_URL}v1/admin/tjk/item-errors/${errorId}/resolve`);
    return response.data;
  };
}

export const tjkService = new TjkService();
