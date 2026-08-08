/** Legacy shape (pre-OpenAPI). Prefer ApiErrorResponse. */
export interface Error {
  application: string;
  errorCode: number;
  errorMessage: string;
  traceId: string;
  errors: ValidationError[];
  parameters: Map<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
}

/** Current BE OpenAPI ErrorResponse */
export interface ApiErrorResponse {
  code?: string;
  message?: string;
  traceId?: string;
  details?: Array<{ code?: string; message?: string }>;
  fieldErrors?: Array<{ field?: string; message?: string; code?: string }>;
  /** legacy */
  errorMessage?: string;
}
