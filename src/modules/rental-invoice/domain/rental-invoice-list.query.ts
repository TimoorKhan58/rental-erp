import type {
  CustomerId,
  RentalOrderId,
} from "@/shared/domain/ids";

import type {
  RentalInvoiceSortField,
  RentalInvoiceStatus,
} from "./rental-invoice.constants";

export type RentalInvoicePaymentStatusFilter =
  | "unpaid"
  | "partial"
  | "paid"
  | "void";

export interface RentalInvoiceListQuery {
  page: number;
  pageSize: number;
  sortBy?: RentalInvoiceSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: RentalInvoiceStatus;
  paymentStatus?: RentalInvoicePaymentStatusFilter;
  customerId?: CustomerId;
  rentalOrderId?: RentalOrderId;
  invoiceDateFrom?: Date;
  invoiceDateTo?: Date;
}
