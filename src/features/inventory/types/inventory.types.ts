import type { PaginationMeta } from "@/types/api";

export type InventoryResponse = {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryListResponse = {
  items: InventoryResponse[];
  meta: PaginationMeta;
};

export type InventorySortField =
  | "quantityOnHand"
  | "reservedQuantity"
  | "minimumStock"
  | "maximumStock"
  | "createdAt"
  | "updatedAt"
  | "isActive";

export type StockStatusFilter =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "overstock";

export type ListInventoryParams = {
  page?: number;
  pageSize?: number;
  sortBy?: InventorySortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  productId?: string;
  warehouseId?: string;
  isActive?: boolean;
};

export type CreateInventoryPayload = {
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reservedQuantity?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  isActive?: boolean;
};

export type UpdateInventoryPayload = {
  quantityOnHand?: number;
  reservedQuantity?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  isActive?: boolean;
};

export type InventorySummaryStats = {
  totalRecords: number;
  totalOnHand: number;
  totalAvailable: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
};
