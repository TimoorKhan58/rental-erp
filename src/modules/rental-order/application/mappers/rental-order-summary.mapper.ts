import type { RentalOrderSummaryQuery } from "@/modules/rental-order/domain/rental-order-summary.query";
import type { CustomerId, WarehouseId } from "@/shared/domain/ids";

import type { GetRentalOrderSummaryInput } from "../schemas/get-rental-order-summary.schema";

export function toRentalOrderSummaryQuery(
  input: GetRentalOrderSummaryInput,
): RentalOrderSummaryQuery {
  return {
    search: input.search,
    status: input.status,
    customerId: input.customerId as CustomerId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
    eventFrom: input.eventFrom,
    eventTo: input.eventTo,
  };
}
