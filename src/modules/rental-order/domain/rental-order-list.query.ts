export interface RentalOrderListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  customerId?: string;
  warehouseId?: string;
}
