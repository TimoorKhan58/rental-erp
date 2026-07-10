import type { AssetStatus } from "./asset.constants";

export interface AssetListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: AssetStatus;
  categoryId?: string;
  warehouseId?: string;
}
