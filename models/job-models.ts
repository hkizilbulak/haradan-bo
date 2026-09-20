export interface Job {
  id: string;
  key?: string;
  job_key?: string;
  name: string;
  description?: string;
  job_type?: string;
  jobType?: string;
  cron_expression?: string;
  cronExpression?: string;
  is_active?: boolean;
  isActive?: boolean;
  timeout_seconds?: number;
  timeoutSeconds?: number;
  timeout_second?: number;
  supports_reference_date?: boolean;
  supportsReferenceDate?: boolean;
  version?: number;
  last_run_at?: string;
  lastRunAt?: string;
  last_status?: string;
  lastStatus?: string;
  last_duration_ms?: number;
  lastDurationMs?: number;
  next_run_at?: string;
  nextRunAt?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface JobHistory {
  id: string;
  jobId?: string;
  job_id?: string;
  status: string;
  executionType?: string;
  execution_type?: string;
  referenceDate?: string;
  reference_date?: string;
  startedAt?: string;
  start_time?: string;
  completedAt?: string;
  end_time?: string;
  durationMs?: number;
  duration_ms?: number;
  processedCount?: number;
  processed_count?: number;
  tjkSyncRunId?: string;
  tjk_sync_run_id?: string;
  lastError?: string;
  error_summary?: string;
  executionNode?: string;
  execution_node?: string;
  triggeredByUserId?: string;
  triggered_by_user_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  job?: Job;
}

export interface RunJobRequest {
  reference_date?: string;
  referenceDate?: string;
}

export interface JobUpdateRequest {
  cron_expression?: string;
  cronExpression?: string;
  is_active?: boolean;
  isActive?: boolean;
  timeout_seconds?: number;
  timeoutSeconds?: number;
  timeout_second?: number;
  expected_version?: number;
  expectedVersion?: number;
}

export interface JobHistoryPage {
  items: JobHistory[];
  nextCursor?: string;
  hasMore?: boolean;
  total?: number;
}
