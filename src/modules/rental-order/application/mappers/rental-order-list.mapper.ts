import type { RentalOrderListQuery } from "@/modules/rental-order/domain/rental-order-list.query";

import type { ListRentalOrdersInput } from "../schemas/list-rental-orders.schema";

export function toRentalOrderListQuery(
  input: ListRentalOrdersInput,
): RentalOrderListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    search: input.search,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    status: input.status,
    customerId: input.customerId,
    warehouseId: input.warehouseId,
  };
}
