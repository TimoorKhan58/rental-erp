import type { DispatchListQuery } from "@/modules/dispatch/domain";
import type { RentalOrderId } from "@/shared/domain/ids";

import type { ListDispatchesInput } from "../schemas/list-dispatches.schema";

export function toDispatchListQuery(input: ListDispatchesInput): DispatchListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortOrder: input.sortOrder,
    status: input.status,
    rentalOrderId: input.rentalOrderId as RentalOrderId | undefined,
    sortBy: input.sortBy,
    search: input.search,
  };
}
