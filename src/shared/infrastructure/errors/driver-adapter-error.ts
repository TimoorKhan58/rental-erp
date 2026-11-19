import { ConflictError, UnprocessableError, type AppError } from "./app-error";

/**
 * Prisma 7 with @prisma/adapter-pg reports database constraint errors as a
 * DriverAdapterError (with `cause.kind` and the PostgreSQL code), not as the
 * classic P2002/P2003 PrismaClientKnownRequestError. Without this, deleting a
 * record that is still in use answered "An unexpected error occurred" (500).
 * Found in the A-to-Z test, 2026-11-19.
 */
interface DriverAdapterCause {
  kind?: string;
  originalCode?: string;
  originalMessage?: string;
}

function driverCause(error: unknown): DriverAdapterCause | undefined {
  if (!(error instanceof Error) || error.name !== "DriverAdapterError") {
    return undefined;
  }
  const cause = (error as Error & { cause?: unknown }).cause;
  return typeof cause === "object" && cause !== null ? (cause as DriverAdapterCause) : {};
}

export const IN_USE_MESSAGE =
  "This record is still used elsewhere (for example on orders, invoices or stock), so it can't be deleted. Deactivate it instead.";

/** Maps a driver adapter constraint error to a clear app error, or undefined. */
export function mapDriverAdapterError(error: unknown): AppError | undefined {
  const cause = driverCause(error);
  if (cause === undefined) {
    return undefined;
  }
  const message = `${cause.originalMessage ?? ""} ${(error as Error).message}`;

  if (cause.kind === "ForeignKeyConstraintViolation" || cause.originalCode === "23503" || /foreign key constraint/i.test(message)) {
    // "update or delete on table … violates …": something still points at it.
    if (/update or delete on table/i.test(message)) {
      return new ConflictError({ message: IN_USE_MESSAGE, cause: error });
    }
    return new UnprocessableError({
      message: "Related record does not exist or cannot be referenced",
      cause: error,
    });
  }

  if (cause.kind === "UniqueConstraintViolation" || cause.originalCode === "23505") {
    return new ConflictError({
      message: "A record with the same unique value already exists",
      cause: error,
    });
  }

  return undefined;
}
