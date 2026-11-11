import type { AssetCategoryId, WarehouseId } from "@/shared/domain/ids";

import type { AssetStatus } from "./asset.constants";

export interface AssetSummaryQuery {
  search?: string;
  status?: AssetStatus;
  categoryId?: AssetCategoryId;
  warehouseId?: WarehouseId;
}
