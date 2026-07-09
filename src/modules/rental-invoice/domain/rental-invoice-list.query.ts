import type {
  CustomerId,
  RentalOrderId,
} from "@/shared/domain/ids";

import type {
  RentalInvoiceSortField,
  RentalInvoiceStatus,
} from "./rental-invoice.constants";

export interface RentalInvoiceListQuery {
  page: number;
  pageSize: number;
  sortBy?: RentalInvoiceSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: RentalInvoiceStatus;
  customerId?: CustomerId;
  rentalOrderId?: RentalOrderId;
}
