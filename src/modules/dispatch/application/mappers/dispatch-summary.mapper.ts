import type { DispatchSummaryQuery } from "@/modules/dispatch/domain/dispatch-summary.query";
import type { RentalOrderId } from "@/shared/domain/ids";

import type { GetDispatchSummaryInput } from "../schemas/get-dispatch-summary.schema";

export function toDispatchSummaryQuery(
  input: GetDispatchSummaryInput,
): DispatchSummaryQuery {
  return {
    search: input.search,
    status: input.status,
    rentalOrderId: input.rentalOrderId as RentalOrderId | undefined,
    warehouseId: input.warehouseId,
    dispatchDateFrom: input.dispatchDateFrom,
    dispatchDateTo: input.dispatchDateTo,
  };
}
