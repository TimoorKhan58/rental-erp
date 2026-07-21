import { deriveStockStatus } from "./inventory-stock.mapper";
import type { InventoryResponse, InventorySummaryStats } from "../types";

export function computeInventorySummary(items: InventoryResponse[]): InventorySummaryStats {
  let totalOnHand = 0;
  let totalAvailable = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let overstockCount = 0;

  for (const item of items) {
    totalOnHand += item.quantityOnHand;
    totalAvailable += item.availableQuantity;

    const status = deriveStockStatus(item);

    switch (status) {
      case "low-stock":
        lowStockCount += 1;
        break;
      case "out-of-stock":
        outOfStockCount += 1;
        break;
      case "overstock":
        overstockCount += 1;
        break;
    }
  }

  return {
    totalRecords: items.length,
    totalOnHand,
    totalAvailable,
    lowStockCount,
    outOfStockCount,
    overstockCount,
  };
}

export function computeStockStatusCounts(
  items: InventoryResponse[],
): Partial<Record<"all" | "in-stock" | "low-stock" | "out-of-stock" | "overstock", number>> {
  const counts = {
    all: items.length,
    "in-stock": 0,
    "low-stock": 0,
    "out-of-stock": 0,
    overstock: 0,
  };

  for (const item of items) {
    counts[deriveStockStatus(item)] += 1;
  }

  return counts;
}
