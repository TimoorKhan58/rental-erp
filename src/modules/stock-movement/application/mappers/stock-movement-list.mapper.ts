import type { StockMovementListQuery } from "@/modules/stock-movement/domain/stock-movement-list.query";

import type { ListStockMovementsInput } from "../schemas/list-stock-movement.schema";

export function toStockMovementListQuery(
  input: ListStockMovementsInput,
): StockMovementListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    inventoryId: input.inventoryId,
    productId: input.productId,
    warehouseId: input.warehouseId,
    movementType: input.movementType,
  };
}
