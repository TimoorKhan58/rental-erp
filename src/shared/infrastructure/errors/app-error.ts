import { ERROR_CODES, type ErrorCode } from "./error-codes";

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  httpStatus: number;
  isOperational?: boolean;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly isOperational: boolean;
  readonly details?: unknown;
  readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);

    this.name = new.target.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.cause = options.cause;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface SubclassOptions {
  message?: string;
  details?: unknown;
  cause?: unknown;
  code?: ErrorCode;
}

export class ValidationError extends AppError {
  constructor(options: SubclassOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.VALIDATION_FAILED,
      message: options.message ?? "Invalid request input",
      httpStatus: 400,
      details: options.details,
      cause: options.cause,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(options: SubclassOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.UNAUTHORIZED,
      message: options.message ?? "Authentication required",
      httpStatus: 401,
      details: options.details,
      cause: options.cause,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(options: SubclassOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.FORBIDDEN,
      message: options.message ?? "You do not have permission to perform this action",
      httpStatus: 403,
      details: options.details,
      cause: options.cause,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(options: SubclassOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.NOT_FOUND,
      message: options.message ?? "Resource not found",
      httpStatus: 404,
      details: options.details,
      cause: options.cause,
    });
  }
}

export class ConflictError extends AppError {
  constructor(options: SubclassOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.CONFLICT,
      message: options.message ?? "Resource conflict",
      httpStatus: 409,
      details: options.details,
      cause: options.cause,
    });
  }
}

export class UnprocessableError extends AppError {
  constructor(options: SubclassOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.INVALID_STATE,
      message: options.message ?? "Request cannot be processed in the current state",
      httpStatus: 422,
      details: options.details,
      cause: options.cause,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(options: SubclassOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.RATE_LIMITED,
      message: options.message ?? "Too many requests",
      httpStatus: 429,
      details: options.details,
      cause: options.cause,
    });
  }
}

interface InternalErrorOptions extends SubclassOptions {
  isOperational?: boolean;
}

export class InternalError extends AppError {
  constructor(options: InternalErrorOptions = {}) {
    super({
      code: options.code ?? ERROR_CODES.INTERNAL_ERROR,
      message: options.message ?? "An unexpected error occurred",
      httpStatus: 500,
      isOperational: options.isOperational ?? false,
      details: options.details,
      cause: options.cause,
    });
  }
}
