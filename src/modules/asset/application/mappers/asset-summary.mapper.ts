import type { AssetCategoryId, WarehouseId } from "@/shared/domain/ids";

import type { GetAssetSummaryInput } from "../schemas/get-asset-summary.schema";

export function toAssetSummaryQuery(input: GetAssetSummaryInput) {
  return {
    search: input.search,
    status: input.status,
    categoryId: input.categoryId as AssetCategoryId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
  };
}
