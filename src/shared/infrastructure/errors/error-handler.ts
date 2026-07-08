import { AppError, InternalError } from "./app-error";
import {
  serializeAppError,
  type SerializedErrorResponse,
} from "./error-serializer";

export interface HttpErrorResponse {
  status: number;
  body: SerializedErrorResponse;
}

export interface ErrorHandlerOptions {
  requestId?: string;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError({ cause: error });
  }

  return new InternalError({ cause: error });
}

export function toHttpErrorResponse(
  error: unknown,
  options: ErrorHandlerOptions = {},
): HttpErrorResponse {
  const normalized = normalizeError(error);

  return {
    status: normalized.httpStatus,
    body: serializeAppError(normalized, options.requestId),
  };
}
