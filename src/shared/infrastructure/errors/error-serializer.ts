import { ERROR_CODES } from "./error-codes";
import { AppError } from "./app-error";

const SAFE_INTERNAL_MESSAGE = "An unexpected error occurred";

export interface SerializedErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface SerializedErrorResponse {
  error: SerializedErrorBody;
  requestId?: string;
}

export function serializeAppError(
  error: AppError,
  requestId?: string,
): SerializedErrorResponse {
  const isPublicError = error.isOperational;

  const body: SerializedErrorBody = {
    code: isPublicError ? error.code : ERROR_CODES.INTERNAL_ERROR,
    message: isPublicError ? error.message : SAFE_INTERNAL_MESSAGE,
  };

  if (isPublicError && error.details !== undefined) {
    body.details = error.details;
  }

  if (requestId === undefined) {
    return { error: body };
  }

  return {
    error: body,
    requestId,
  };
}
