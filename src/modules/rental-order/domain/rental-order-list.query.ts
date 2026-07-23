export interface RentalOrderListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  customerId?: string;
  warehouseId?: string;
  /** Inclusive — keep orders with eventEndDate >= eventFrom. */
  eventFrom?: Date;
  /** Inclusive — keep orders with eventStartDate <= eventTo. */
  eventTo?: Date;
}
