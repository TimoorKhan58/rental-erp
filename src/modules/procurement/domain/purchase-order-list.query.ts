export interface PurchaseOrderListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  supplierId?: string;
  warehouseId?: string;
}
