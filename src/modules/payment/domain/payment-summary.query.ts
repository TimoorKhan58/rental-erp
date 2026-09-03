import type { CustomerId, RentalInvoiceId } from "@/shared/domain/ids";

import type { PaymentMethod, PaymentStatus } from "./payment.constants";

export interface PaymentSummaryQuery {
  search?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  customerId?: CustomerId;
  rentalInvoiceId?: RentalInvoiceId;
  paymentDateFrom?: Date;
  paymentDateTo?: Date;
}
