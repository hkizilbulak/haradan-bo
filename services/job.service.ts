import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';

export interface JobResponse extends BaseResponse {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  jobType: string;
  cronExpression: string;
  isActive: boolean;
  timeoutSeconds: number;
  supportsReferenceDate: boolean;
  version: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastStatus?: string | null;
  lastDurationMs?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobRequest {
  identifier?: string;
  expectedVersion: number;
  cronExpression: string;
  isActive: boolean;
  timeoutSeconds: number;
}

export interface JobHistoryItem {
  id: string;
  jobId: string;
  status: 'QUEUED' | 'LEASED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'DEAD';
  executionType: 'SCHEDULED' | 'MANUAL';
  referenceDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type JobHistoryPage = {
  items: JobHistoryItem[];
  nextCursor?: string | null;
  hasMore: boolean;
};

type JobListResponse = { items?: JobResponse[] };

const baseUrl = `${API_URL}v1/admin/jobs`;

export class JobService {
  search = async (_params: SearchParams<JobResponse>): Promise<PagedResponse<JobResponse>> => {
    const response = await axiosInstance.get(baseUrl);
    const data = response.data as JobListResponse;
    const content = data.items ?? [];
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

  update = async (jobId: string, request: JobRequest) => {
    await axiosInstance.patch(`${baseUrl}/${jobId}`, {
      expectedVersion: request.expectedVersion,
      cronExpression: request.cronExpression,
      isActive: request.isActive,
      timeoutSeconds: Number(request.timeoutSeconds),
    });
  };

  run = async (jobId: string) => {
    await axiosInstance.post(`${baseUrl}/${jobId}/run`, {});
  };

  getHistory = async (jobId: string): Promise<JobHistoryItem[]> => {
    const items: JobHistoryItem[] = [];
    let cursor: string | undefined;
    while (true) {
      const response = await axiosInstance.get(`${baseUrl}/${jobId}/history`, {
        params: { cursor, limit: 50 },
      });
      const data = response.data as JobHistoryPage;
      items.push(...data.items);
      if (!data.hasMore || !data.nextCursor) {
        return items;
      }
      cursor = data.nextCursor;
    }
  };
}

export const jobService = new JobService();
