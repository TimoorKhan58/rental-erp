import { Prisma } from "@/generated/prisma/client";
import {
  ConflictError,
  InternalError,
  isAppError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { CrossOrganizationWriteError } from "@/shared/infrastructure/tenancy/organization-scope";

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

/**
 * A write that points at another business's record (rejected by the
 * database trigger or the organization guard) is reported exactly like a
 * missing record, so it reveals nothing about other businesses.
 */
function isCrossOrganizationReference(error: unknown): boolean {
  return (
    error instanceof CrossOrganizationWriteError ||
    (error instanceof Error &&
      error.message.includes("RENTCORE_CROSS_ORGANIZATION_REFERENCE"))
  );
}

export function mapPrismaError(error: unknown): Error {
  if (isAppError(error)) {
    return error;
  }

  if (isCrossOrganizationReference(error)) {
    return new NotFoundError({
      message: "Requested resource was not found.",
      cause: error as Error,
    });
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
