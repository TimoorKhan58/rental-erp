import type { ReturnListQuery } from "@/modules/return/domain";
import type { DispatchId, RentalOrderId } from "@/shared/domain/ids";

import type { ListReturnsInput } from "../schemas/list-returns.schema";

export function toReturnListQuery(input: ListReturnsInput): ReturnListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortOrder: input.sortOrder,
    status: input.status,
    rentalOrderId: input.rentalOrderId as RentalOrderId | undefined,
    dispatchId: input.dispatchId as DispatchId | undefined,
    sortBy: input.sortBy,
    search: input.search,
  };
}
