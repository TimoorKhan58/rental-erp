import type { Inventory } from "./inventory.entity";
import type { InventorySummaryQuery } from "./inventory-summary.query";
import type {
  InventoryStockStatus,
  InventoryStockStatusCounts,
  InventorySummaryProjection,
  InventorySummaryResult,
  InventorySummaryStats,
} from "./inventory-summary.types";

export function deriveInventoryStockStatus(
  item: InventorySummaryProjection,
): InventoryStockStatus {
  const availableQuantity = item.quantityOnHand - item.reservedQuantity;

  if (availableQuantity <= 0) {
    return "out-of-stock";
  }

  if (item.minimumStock > 0 && availableQuantity <= item.minimumStock) {
    return "low-stock";
  }

  if (item.maximumStock !== null && item.quantityOnHand > item.maximumStock) {
    return "overstock";
  }

  return "in-stock";
}

export function matchesInventorySummaryQuery(
  item: Pick<
    Inventory,
    | "productId"
    | "warehouseId"
    | "isActive"
    | "quantityOnHand"
    | "reservedQuantity"
    | "minimumStock"
    | "maximumStock"
  >,
  query: InventorySummaryQuery,
  options?: { productName?: string; productSku?: string },
): boolean {
  if (query.productId !== undefined && item.productId !== query.productId) {
    return false;
  }

  if (query.warehouseId !== undefined && item.warehouseId !== query.warehouseId) {
    return false;
  }

  if (query.isActive !== undefined && item.isActive !== query.isActive) {
    return false;
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesProductId = item.productId.toLowerCase().includes(term);
    const matchesName =
      options?.productName !== undefined &&
      options.productName.toLowerCase().includes(term);
    const matchesSku =
      options?.productSku !== undefined &&
      options.productSku.toLowerCase().includes(term);

    if (!matchesProductId && !matchesName && !matchesSku) {
      return false;
    }
  }

  return true;
}

export function filterInventoryForSummary(
  items: Inventory[],
  query: InventorySummaryQuery,
): Inventory[] {
  return items.filter((item) => matchesInventorySummaryQuery(item, query));
}

export function computeInventorySummaryResult(
  items: InventorySummaryProjection[],
): InventorySummaryResult {
  let totalOnHand = 0;
  let totalAvailable = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let overstockCount = 0;

  const stockStatusCounts: InventoryStockStatusCounts = {
    all: items.length,
    "in-stock": 0,
    "low-stock": 0,
    "out-of-stock": 0,
    overstock: 0,
  };

  for (const item of items) {
    totalOnHand += item.quantityOnHand;
    totalAvailable += item.quantityOnHand - item.reservedQuantity;

    const status = deriveInventoryStockStatus(item);
    stockStatusCounts[status] += 1;
  }

  lowStockCount = stockStatusCounts["low-stock"];
  outOfStockCount = stockStatusCounts["out-of-stock"];
  overstockCount = stockStatusCounts.overstock;

  const stats: InventorySummaryStats = {
    totalRecords: items.length,
    totalOnHand,
    totalAvailable,
    lowStockCount,
    outOfStockCount,
    overstockCount,
  };

  return { stats, stockStatusCounts };
}
