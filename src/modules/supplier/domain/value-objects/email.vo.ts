import type { Brand } from "@/shared/domain/ids";

import { SupplierInvariantError } from "../supplier.errors";

export type Email = Brand<string, "SupplierEmail">;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createEmail(value: string | null | undefined): Email | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > 200) {
    throw new SupplierInvariantError("Email must not exceed 200 characters", "email");
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    throw new SupplierInvariantError("Invalid email format", "email");
  }

  return trimmed as Email;
}
