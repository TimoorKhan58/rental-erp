import type { Brand } from "@/shared/domain/ids";

import { ProductInvariantError } from "../product.errors";

export type ReplacementCost = Brand<number, "ReplacementCost">;

export function createReplacementCost(
  value: number | null | undefined,
): ReplacementCost | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new ProductInvariantError(
      "Replacement cost must be non-negative",
      "replacementCost",
    );
  }

  return value as ReplacementCost;
}
