import { AppError, InternalError, ValidationError } from "./app-error";
import { mapDriverAdapterError } from "./driver-adapter-error";
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

  // A database constraint error that escaped the repository layer.
  const adapterError = mapDriverAdapterError(error);
  if (adapterError !== undefined) {
    return adapterError;
  }

  // `await request.json()` on a body that is not valid JSON.
  if (error instanceof SyntaxError && /JSON/i.test(error.message)) {
    return new ValidationError({ message: "The request body is not valid JSON", cause: error });
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
