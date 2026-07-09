import type { Brand } from "@/shared/domain/ids";

import { SupplierInvariantError } from "../supplier.errors";

export type PhoneNumber = Brand<string, "SupplierPhoneNumber">;

const PHONE_PATTERN = /^[+]?[\d\s()-]+$/;

export function createPhoneNumber(value: string): PhoneNumber {
  const trimmed = value.trim();

  if (trimmed.length < 7) {
    throw new SupplierInvariantError("Phone number is too short", "phone");
  }

  if (trimmed.length > 20) {
    throw new SupplierInvariantError("Phone number is too long", "phone");
  }

  if (!PHONE_PATTERN.test(trimmed)) {
    throw new SupplierInvariantError("Invalid phone number format", "phone");
  }

  return trimmed as PhoneNumber;
}
