export type InventoryStockStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "overstock";

export interface InventorySummaryStats {
  totalRecords: number;
  totalOnHand: number;
  totalAvailable: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
}

export type InventoryStockStatusCounts = Record<
  "all" | InventoryStockStatus,
  number
>;

export interface InventorySummaryResult {
  stats: InventorySummaryStats;
  stockStatusCounts: InventoryStockStatusCounts;
}

export type InventorySummaryProjection = {
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
};
