import type { DispatchId, RentalOrderId } from "@/shared/domain/ids";

import type { GetReturnSummaryInput } from "../schemas/get-return-summary.schema";

export function toReturnSummaryQuery(input: GetReturnSummaryInput) {
  return {
    search: input.search,
    status: input.status,
    rentalOrderId: input.rentalOrderId as RentalOrderId | undefined,
    dispatchId: input.dispatchId as DispatchId | undefined,
    returnDateFrom: input.returnDateFrom,
    returnDateTo: input.returnDateTo,
  };
}
