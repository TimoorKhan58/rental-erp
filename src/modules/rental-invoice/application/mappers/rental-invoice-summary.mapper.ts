import type { RentalInvoiceSummaryQuery } from "@/modules/rental-invoice/domain/rental-invoice-summary.query";
import type {
  CustomerId,
  RentalOrderId,
} from "@/shared/domain/ids";

import type { GetRentalInvoiceSummaryInput } from "../schemas/get-rental-invoice-summary.schema";

export function toRentalInvoiceSummaryQuery(
  input: GetRentalInvoiceSummaryInput,
): RentalInvoiceSummaryQuery {
  return {
    search: input.search,
    status: input.status,
    paymentStatus: input.paymentStatus,
    customerId: input.customerId as CustomerId | undefined,
    rentalOrderId: input.rentalOrderId as RentalOrderId | undefined,
    invoiceDateFrom: input.invoiceDateFrom,
    invoiceDateTo: input.invoiceDateTo,
  };
}
