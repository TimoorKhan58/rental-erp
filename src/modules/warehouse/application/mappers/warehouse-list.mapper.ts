import type { WarehouseListQuery } from "@/modules/warehouse/domain/warehouse-list.query";

import type { ListWarehousesInput } from "../schemas/list-warehouses.schema";

export function toWarehouseListQuery(
  input: ListWarehousesInput,
): WarehouseListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
