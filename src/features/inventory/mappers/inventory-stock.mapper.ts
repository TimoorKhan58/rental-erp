import type { InventoryResponse } from "../types";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "overstock";

/**
 * Presentation-only: resolves the row/card left-accent class for a given
 * inventory row. Kept as a pure helper so desktop table + mobile list can
 * stay consistent and regressions are unit-testable.
 *
 * Attention semantics come from `needsInventoryAttention` (out-of-stock,
 * low-stock, or inactive). Attention on stock-ok active rows should not
 * occur; it falls back to transparent.
 */
export function resolveInventoryRowAccentClass(item: InventoryResponse): string {
  if (item.availableQuantity <= 0) {
    return "border-l-destructive";
  }

  if (item.minimumStock > 0 && item.availableQuantity <= item.minimumStock) {
    return "border-l-warning";
  }

  if (!item.isActive) {
    return "border-l-muted-foreground/40";
  }

  return "border-l-transparent";
}

export function deriveStockStatus(item: InventoryResponse): StockStatus {
  if (item.availableQuantity <= 0) {
    return "out-of-stock";
  }

  if (item.minimumStock > 0 && item.availableQuantity <= item.minimumStock) {
    return "low-stock";
  }

  if (item.maximumStock !== null && item.quantityOnHand > item.maximumStock) {
    return "overstock";
  }

  return "in-stock";
}

export function matchesStockStatusFilter(
  item: InventoryResponse,
  filter: string | undefined,
): boolean {
  if (!filter || filter === "all") {
    return true;
  }

  return deriveStockStatus(item) === filter;
}
