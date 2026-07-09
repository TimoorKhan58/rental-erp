import type { Brand } from "@/shared/domain/ids";

import { ProductInvariantError } from "../product.errors";

export type Unit = Brand<string, "Unit">;

export function createUnit(value: string): Unit {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ProductInvariantError("Unit is required", "unit");
  }

  if (trimmed.length > 50) {
    throw new ProductInvariantError(
      "Unit must not exceed 50 characters",
      "unit",
    );
  }

  return trimmed as Unit;
}
