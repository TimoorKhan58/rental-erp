import type { InventoryListQuery } from "@/modules/inventory/domain/inventory-list.query";

import type { ListInventoryInput } from "../schemas/list-inventory.schema";

export function toInventoryListQuery(
  input: ListInventoryInput,
): InventoryListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    productId: input.productId,
    warehouseId: input.warehouseId,
    isActive: input.isActive,
  };
}
