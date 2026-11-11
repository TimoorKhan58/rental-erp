import type {
  CustomerId,
  RentalOrderId,
} from "@/shared/domain/ids";

import type {
  RentalInvoiceStatus,
} from "./rental-invoice.constants";
import type { RentalInvoicePaymentStatusFilter } from "./rental-invoice-list.query";

export interface RentalInvoiceSummaryQuery {
  search?: string;
  status?: RentalInvoiceStatus;
  paymentStatus?: RentalInvoicePaymentStatusFilter;
  customerId?: CustomerId;
  rentalOrderId?: RentalOrderId;
  invoiceDateFrom?: Date;
  invoiceDateTo?: Date;
}
