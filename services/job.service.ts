import axiosInstance from '@/helpers/api/axiosInstance';
import { API_URL } from '@/contants/urls';
import { PagedResponse } from '@/models/common';
import { Job, JobHistory, JobHistoryPage, JobUpdateRequest, RunJobRequest, CreateJobRequest } from '@/models/job-models';

function normalizeJob(raw: any): Job {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id,
    key: raw.key || raw.job_key,
    job_key: raw.key || raw.job_key,
    name: raw.name,
    description: raw.description,
    jobType: raw.jobType || raw.job_type,
    job_type: raw.jobType || raw.job_type,
    cronExpression: raw.cronExpression || raw.cron_expression,
    cron_expression: raw.cronExpression || raw.cron_expression,
    isActive: raw.isActive !== undefined ? raw.isActive : raw.is_active,
    is_active: raw.isActive !== undefined ? raw.isActive : raw.is_active,
    timeoutSeconds: raw.timeoutSeconds || raw.timeout_seconds || raw.timeout_second || 3600,
    timeout_seconds: raw.timeoutSeconds || raw.timeout_seconds || raw.timeout_second || 3600,
    timeout_second: raw.timeoutSeconds || raw.timeout_seconds || raw.timeout_second || 3600,
    supportsReferenceDate: raw.supportsReferenceDate !== undefined ? raw.supportsReferenceDate : raw.supports_reference_date,
    supports_reference_date: raw.supportsReferenceDate !== undefined ? raw.supportsReferenceDate : raw.supports_reference_date,
    supportsPageNumber: raw.supportsPageNumber !== undefined ? raw.supportsPageNumber : (raw.supports_page_number !== undefined ? raw.supports_page_number : (raw.jobType === 'TJK_SYNC' || raw.job_type === 'TJK_SYNC' || (raw.key || raw.job_key || '').includes('TJK'))),
    supports_page_number: raw.supportsPageNumber !== undefined ? raw.supportsPageNumber : (raw.supports_page_number !== undefined ? raw.supports_page_number : (raw.jobType === 'TJK_SYNC' || raw.job_type === 'TJK_SYNC' || (raw.key || raw.job_key || '').includes('TJK'))),
    version: raw.version || 1,
    lastRunAt: raw.lastRunAt || raw.last_run_at,
    last_run_at: raw.lastRunAt || raw.last_run_at,
    lastStatus: raw.lastStatus || raw.last_status,
    last_status: raw.lastStatus || raw.last_status,
    lastDurationMs: raw.lastDurationMs ?? raw.last_duration_ms,
    last_duration_ms: raw.lastDurationMs ?? raw.last_duration_ms,
    nextRunAt: raw.nextRunAt || raw.next_run_at,
    next_run_at: raw.nextRunAt || raw.next_run_at,
    createdAt: raw.createdAt || raw.created_at,
    created_at: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
    updated_at: raw.updatedAt || raw.updated_at,
  };
}

function normalizeJobHistory(raw: any): JobHistory {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id,
    jobId: raw.jobId || raw.job_id,
    job_id: raw.jobId || raw.job_id,
    status: raw.status,
    executionType: raw.executionType || raw.execution_type,
    execution_type: raw.executionType || raw.execution_type,
    referenceDate: raw.referenceDate || raw.reference_date,
    reference_date: raw.referenceDate || raw.reference_date,
    startedAt: raw.startedAt || raw.start_time,
    start_time: raw.startedAt || raw.start_time,
    completedAt: raw.completedAt || raw.end_time,
    end_time: raw.completedAt || raw.end_time,
    durationMs: raw.durationMs ?? raw.duration_ms,
    duration_ms: raw.durationMs ?? raw.duration_ms,
    processedCount: raw.processedCount ?? raw.processed_count ?? 0,
    processed_count: raw.processedCount ?? raw.processed_count ?? 0,
    tjkSyncRunId: raw.tjkSyncRunId || raw.tjk_sync_run_id,
    tjk_sync_run_id: raw.tjkSyncRunId || raw.tjk_sync_run_id,
    lastError: raw.lastError || raw.error_summary,
    error_summary: raw.lastError || raw.error_summary,
    executionNode: raw.executionNode || raw.execution_node,
    execution_node: raw.executionNode || raw.execution_node,
    triggeredByUserId: raw.triggeredByUserId || raw.triggered_by_user_id,
    triggered_by_user_id: raw.triggeredByUserId || raw.triggered_by_user_id,
    createdAt: raw.createdAt || raw.created_at,
    created_at: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
    updated_at: raw.updatedAt || raw.updated_at,
  };
}

class JobService {
  private baseUrl = `${API_URL}v1/admin/jobs`;

  // Get all jobs with optional sorting
  async getJobs(sort?: string, direction?: string): Promise<Job[]> {
    const params = new URLSearchParams();
    if (sort) params.append('sort', sort);
    if (direction) params.append('direction', direction);

    const response = await axiosInstance.get<{ items: any[] } | any[]>(this.baseUrl, { params });
    const rawList = Array.isArray(response.data) ? response.data : (response.data?.items || []);
    let list = rawList.map(normalizeJob);

    if (sort) {
      list.sort((a: any, b: any) => {
        let valA = a[sort] ?? '';
        let valB = b[sort] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return direction === 'DESC' ? 1 : -1;
        if (valA > valB) return direction === 'DESC' ? -1 : 1;
        return 0;
      });
    }

    return list;
  }

  // Create job
  async createJob(payload: CreateJobRequest): Promise<{ message?: string; job?: Job }> {
    const body: any = {
      key: payload.key,
      name: payload.name,
      description: payload.description,
      jobType: payload.jobType || payload.job_type,
      cronExpression: payload.cronExpression || payload.cron_expression,
      isActive: payload.isActive !== undefined ? payload.isActive : payload.is_active ?? true,
      timeoutSeconds: payload.timeoutSeconds ?? payload.timeout_seconds ?? 3600,
      supportsReferenceDate: payload.supportsReferenceDate ?? payload.supports_reference_date ?? false,
      supportsPageNumber: payload.supportsPageNumber ?? payload.supports_page_number ?? true,
    };
    const response = await axiosInstance.post<any>(this.baseUrl, body);
    return {
      message: 'Görev başarıyla oluşturuldu',
      job: normalizeJob(response.data),
    };
  }

  // Get job by ID
  async getJobById(id: string): Promise<Job> {
    const response = await axiosInstance.get<any>(`${this.baseUrl}/${id}`);
    return normalizeJob(response.data);
  }

  // Update job (cron, is_active, timeout, supportsReferenceDate, supportsPageNumber)
  async updateJob(id: string, data: JobUpdateRequest): Promise<{ message?: string; job?: Job }> {
    const body: any = {};
    if (data.expected_version !== undefined || data.expectedVersion !== undefined) {
      body.expectedVersion = data.expected_version ?? data.expectedVersion;
    }
    if (data.cron_expression !== undefined || data.cronExpression !== undefined) {
      body.cronExpression = data.cron_expression ?? data.cronExpression;
    }
    if (data.is_active !== undefined || data.isActive !== undefined) {
      body.isActive = data.is_active ?? data.isActive;
    }
    if (data.timeout_seconds !== undefined || data.timeoutSeconds !== undefined || data.timeout_second !== undefined) {
      body.timeoutSeconds = data.timeout_seconds ?? data.timeoutSeconds ?? data.timeout_second;
    }
    if (data.supports_reference_date !== undefined || data.supportsReferenceDate !== undefined) {
      body.supportsReferenceDate = data.supports_reference_date ?? data.supportsReferenceDate;
    }
    if (data.supports_page_number !== undefined || data.supportsPageNumber !== undefined) {
      body.supportsPageNumber = data.supports_page_number ?? data.supportsPageNumber;
    }

    const response = await axiosInstance.patch<any>(`${this.baseUrl}/${id}`, body);
    return {
      message: 'Görev başarıyla güncellendi',
      job: normalizeJob(response.data),
    };
  }

  // Trigger job manually
  async runJob(id: string, payload?: RunJobRequest): Promise<{ message: string; runId?: string }> {
    const refDate = payload?.reference_date || payload?.referenceDate;
    const pageNumber = payload?.page_number ?? payload?.pageNumber;
    const body: Record<string, any> = {};
    if (refDate) body.referenceDate = refDate;
    if (pageNumber !== undefined && pageNumber !== null) body.pageNumber = pageNumber;
    const response = await axiosInstance.post<{ jobId: string; runId: string }>(
      `${this.baseUrl}/${id}/run`,
      Object.keys(body).length > 0 ? body : undefined
    );
    return {
      message: 'Görev başarıyla tetiklendi',
      runId: response.data?.runId,
    };
  }

  // Cancel running job
  async cancelJob(id: string): Promise<{ message: string }> {
    const response = await axiosInstance.post<{ jobId: string; message: string }>(`${this.baseUrl}/${id}/cancel`);
    return {
      message: response.data?.message || 'Görev başarıyla durduruldu',
    };
  }

  // Get job history
  async getJobHistory(
    id: string,
    params: {
      cursor?: string;
      limit?: number;
    } = {}
  ): Promise<JobHistoryPage> {
    const query = new URLSearchParams();
    if (params.cursor) query.append('cursor', params.cursor);
    if (params.limit) query.append('limit', String(params.limit));

    const response = await axiosInstance.get<{ items: any[]; nextCursor?: string; hasMore?: boolean }>(
      `${this.baseUrl}/${id}/history`,
      { params: query }
    );

    const items = (response.data?.items || []).map(normalizeJobHistory);
    return {
      items,
      nextCursor: response.data?.nextCursor,
      hasMore: response.data?.hasMore,
      total: items.length,
    };
  }

  async search(params?: any): Promise<PagedResponse<Job>> {
    const jobs = await this.getJobs();
    return {
      content: jobs,
      page: {
        size: jobs.length,
        totalElements: jobs.length,
        totalPages: 1,
        number: 0,
      },
    };
  }

  // Aliases for compatibility
  update(id: string, values: any) {
    return this.updateJob(id, values);
  }

  run(id: string) {
    return this.runJob(id);
  }

  async getHistory(id: string): Promise<JobHistory[]> {
    const res = await this.getJobHistory(id);
    return res.items;
  }
}

export type JobRequest = JobUpdateRequest & { identifier?: string };
export type JobResponse = Job;
export type JobHistoryItem = JobHistory;

export const jobService = new JobService();
