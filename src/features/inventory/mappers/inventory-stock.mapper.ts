import type { InventoryResponse } from "../types";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "overstock";

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
