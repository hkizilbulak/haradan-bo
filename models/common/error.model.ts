export interface Error {
  application: string;
  errorCode: number;
  errorMessage: number;
  traceId: string;
  errors: ValidationError[];
  parameters: Map<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
}