import {
  InternalError,
  isAppError,
  NotFoundError,
} from "@/shared/infrastructure/errors";

interface NodeErrorLike {
  code?: string;
}

function isNodeError(error: unknown): error is NodeErrorLike {
  return typeof error === "object" && error !== null && "code" in error;
}

export function mapStorageError(error: unknown): Error {
  if (isAppError(error)) {
    return error;
  }

  if (isNodeError(error) && error.code === "ENOENT") {
    return new NotFoundError({
      message: "File not found",
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new InternalError({ cause: error });
  }

  return new InternalError({ cause: error });
}
