import type { Brand } from "@/shared/domain/ids";

import { CustomerInvariantError } from "../customer.errors";

export type Cnic = Brand<string, "Cnic">;

const CNIC_PATTERN = /^[\d-]{13,15}$/;

export function createCnic(value: string | null | undefined): Cnic | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (!CNIC_PATTERN.test(trimmed)) {
    throw new CustomerInvariantError("Invalid CNIC format", "cnic");
  }

  return trimmed as Cnic;
}
