import type {
  CustomerId,
  RentalInvoiceId,
} from "@/shared/domain/ids";

import type { PaymentSortField, PaymentStatus } from "./payment.constants";

export interface PaymentListQuery {
  page: number;
  pageSize: number;
  sortBy?: PaymentSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: PaymentStatus;
  customerId?: CustomerId;
  rentalInvoiceId?: RentalInvoiceId;
}
