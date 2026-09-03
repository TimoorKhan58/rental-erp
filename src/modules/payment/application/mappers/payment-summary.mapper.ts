import type { PaymentSummaryQuery } from "@/modules/payment/domain/payment-summary.query";
import type { CustomerId, RentalInvoiceId } from "@/shared/domain/ids";

import type { GetPaymentSummaryInput } from "../schemas/get-payment-summary.schema";

export function toPaymentSummaryQuery(
  input: GetPaymentSummaryInput,
): PaymentSummaryQuery {
  return {
    search: input.search,
    status: input.status,
    paymentMethod: input.paymentMethod,
    customerId: input.customerId as CustomerId | undefined,
    rentalInvoiceId: input.rentalInvoiceId as RentalInvoiceId | undefined,
    paymentDateFrom: input.paymentDateFrom,
    paymentDateTo: input.paymentDateTo,
  };
}
