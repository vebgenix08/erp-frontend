export interface ApiErrorShape {
  code: string;
  message: string;
  retryable: boolean;
  traceId?: string | undefined;
  status?: number | undefined;
}

export class ApiError extends Error implements ApiErrorShape {
  readonly code: string;
  readonly retryable: boolean;
  readonly traceId: string | undefined;
  readonly status: number | undefined;

  constructor(shape: ApiErrorShape) {
    super(shape.traceId ? `${shape.message} Reference: ${shape.traceId}` : shape.message);
    this.name = "ApiError";
    this.code = shape.code;
    this.retryable = shape.retryable;
    this.traceId = shape.traceId;
    this.status = shape.status;
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

export const friendlyApiMessage = (error: unknown): string => {
  if (isApiError(error) && error.code === "SERVICE_BUSY") {
    return "This view is temporarily busy. Your data is safe. Please wait a moment and try again.";
  }
  return error instanceof Error ? error.message : "The request could not be completed.";
};
