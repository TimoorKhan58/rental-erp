export interface SuccessApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface ErrorApiResponseBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorApiResponse {
  error: ErrorApiResponseBody;
  requestId: string;
}

export interface RouteHandlerResult<T> {
  status: number;
  body: SuccessApiResponse<T> | ErrorApiResponse;
}

export function successResponse<T>(
  data: T,
  requestId: string,
  meta?: Record<string, unknown>,
): SuccessApiResponse<T> {
  if (meta === undefined) {
    return {
      data,
      requestId,
    };
  }

  return {
    data,
    meta,
    requestId,
  };
}

export function errorResponse(
  error: ErrorApiResponseBody,
  requestId: string,
): ErrorApiResponse {
  return {
    error,
    requestId,
  };
}
