import type {
  CustomerId,
  RentalInvoiceId,
} from "@/shared/domain/ids";

import type { PaymentMethod, PaymentSortField, PaymentStatus } from "./payment.constants";

export interface PaymentListQuery {
  page: number;
  pageSize: number;
  sortBy?: PaymentSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  customerId?: CustomerId;
  rentalInvoiceId?: RentalInvoiceId;
  paymentDateFrom?: Date;
  paymentDateTo?: Date;
}
