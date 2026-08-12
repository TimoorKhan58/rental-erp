export interface ExternalRentalListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  settlementStatus?: string;
  supplierId?: string;
  warehouseId?: string;
  rentalOrderId?: string;
  hireStartFrom?: Date;
  hireStartTo?: Date;
}
