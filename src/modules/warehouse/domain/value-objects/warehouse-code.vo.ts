import type { Brand } from "@/shared/domain/ids";

import { WarehouseInvariantError } from "../warehouse.errors";

export type WarehouseCode = Brand<string, "WarehouseCode">;

export function createWarehouseCode(value: string): WarehouseCode {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new WarehouseInvariantError("Warehouse code is required", "warehouseCode");
  }

  if (trimmed.length > 50) {
    throw new WarehouseInvariantError(
      "Warehouse code must not exceed 50 characters",
      "warehouseCode",
    );
  }

  return trimmed as WarehouseCode;
}
