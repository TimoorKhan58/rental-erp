import type { Brand } from "@/shared/domain/ids";

import { WarehouseInvariantError } from "../warehouse.errors";

export type PhoneNumber = Brand<string, "WarehousePhoneNumber">;

const PHONE_PATTERN = /^[+]?[\d\s()-]+$/;

export function createPhoneNumber(
  value: string | null | undefined,
): PhoneNumber | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length < 7) {
    throw new WarehouseInvariantError("Phone number is too short", "phone");
  }

  if (trimmed.length > 20) {
    throw new WarehouseInvariantError("Phone number is too long", "phone");
  }

  if (!PHONE_PATTERN.test(trimmed)) {
    throw new WarehouseInvariantError("Invalid phone number format", "phone");
  }

  return trimmed as PhoneNumber;
}
