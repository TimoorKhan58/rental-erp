import type { Brand } from "@/shared/domain/ids";

import { CustomerInvariantError } from "../customer.errors";

export type PhoneNumber = Brand<string, "PhoneNumber">;

const PHONE_PATTERN = /^[+]?[\d\s()-]+$/;

export function createPhoneNumber(value: string): PhoneNumber {
  const trimmed = value.trim();

  if (trimmed.length < 7) {
    throw new CustomerInvariantError("Phone number is too short", "phone");
  }

  if (trimmed.length > 20) {
    throw new CustomerInvariantError("Phone number is too long", "phone");
  }

  if (!PHONE_PATTERN.test(trimmed)) {
    throw new CustomerInvariantError("Invalid phone number format", "phone");
  }

  return trimmed as PhoneNumber;
}
