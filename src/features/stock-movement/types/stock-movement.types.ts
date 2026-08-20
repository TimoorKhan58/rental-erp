import type { PaginationMeta } from "@/types/api";

export type StockMovementResponse = {
  id: string;
  inventoryId: string;
  productId: string;
  warehouseId: string;
  movementType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  remarks: string;
  createdAt: string;
  createdById: string;
};

export type StockMovementListResponse = {
  items: StockMovementResponse[];
  meta: PaginationMeta;
};

export type StockMovementSortField =
  | "quantity"
  | "previousQuantity"
  | "newQuantity"
  | "movementType"
  | "createdAt";

export type ListStockMovementsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: StockMovementSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  inventoryId?: string;
  productId?: string;
  warehouseId?: string;
  movementType?: string;
};
