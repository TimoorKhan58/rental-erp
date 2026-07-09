import type { Brand } from "@/shared/domain/ids";

import { SupplierInvariantError } from "../supplier.errors";

export type SupplierCode = Brand<string, "SupplierCode">;

export function createSupplierCode(value: string): SupplierCode {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new SupplierInvariantError("Supplier code is required", "supplierCode");
  }

  if (trimmed.length > 50) {
    throw new SupplierInvariantError(
      "Supplier code must not exceed 50 characters",
      "supplierCode",
    );
  }

  return trimmed as SupplierCode;
}
