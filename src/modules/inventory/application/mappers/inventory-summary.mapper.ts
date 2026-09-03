import type { ProductId, WarehouseId } from "@/shared/domain/ids";

import type { GetInventorySummaryInput } from "../schemas/get-inventory-summary.schema";

export function toInventorySummaryQuery(input: GetInventorySummaryInput) {
  return {
    search: input.search,
    productId: input.productId as ProductId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
    isActive: input.isActive,
  };
}
