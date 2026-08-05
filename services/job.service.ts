import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { BaseResponse, PagedResponse, SearchParams } from '@/models/common';
import { BaseService } from './base.service';

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

type JobListResponse = { items?: JobResponse[] };

const baseUrl = `${API_URL}v1/admin/jobs`;

export class JobService extends BaseService {
  constructor() {
    super(baseUrl);
  }

  search = async <T extends BaseResponse>(params: SearchParams<T>) => {
    const response = await axiosInstance.get(baseUrl);
    const data = response.data as JobListResponse;
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
}

export const jobService = new JobService();
