import { Prisma } from "@/generated/prisma/client";
import {
  ConflictError,
  InternalError,
  isAppError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";

function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function isPrismaClientError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  );
}

function extractConflictTarget(
  meta: Prisma.PrismaClientKnownRequestError["meta"],
): unknown {
  if (meta === undefined || !("target" in meta)) {
    return undefined;
  }

  return meta.target;
}

function mapKnownRequestError(
  error: Prisma.PrismaClientKnownRequestError,
): Error {
  switch (error.code) {
    case "P2002": {
      const target = extractConflictTarget(error.meta);

      return new ConflictError({
        message: "A record with the same unique value already exists",
        details: target !== undefined ? { target } : undefined,
        cause: error,
      });
    }
    case "P2025":
      return new NotFoundError({
        message: "Requested resource was not found.",
        cause: error,
      });
    case "P2003":
      return new UnprocessableError({
        message: "Related record does not exist or cannot be referenced",
        cause: error,
      });
    case "P2014":
      return new UnprocessableError({
        message: "Required relation constraint was violated",
        cause: error,
      });
    default:
      return new InternalError({
        code: ERROR_CODES.DATABASE_ERROR,
        cause: error,
      });
  }
}

export function mapPrismaError(error: unknown): Error {
  if (isAppError(error)) {
    return error;
  }

  if (isPrismaKnownRequestError(error)) {
    return mapKnownRequestError(error);
  }

  if (isPrismaClientError(error)) {
    return new InternalError({
      code: ERROR_CODES.DATABASE_ERROR,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return error;
  }

  return error as Error;
}
