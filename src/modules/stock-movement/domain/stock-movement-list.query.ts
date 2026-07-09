import type { StockMovementType } from "./stock-movement.constants";

export interface StockMovementListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  inventoryId?: string;
  productId?: string;
  warehouseId?: string;
  movementType?: StockMovementType;
}
