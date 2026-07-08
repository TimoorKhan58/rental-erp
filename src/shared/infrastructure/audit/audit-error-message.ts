import { normalizeError } from "@/shared/infrastructure/errors";

export function extractAuditErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}
