import type { AssetListQuery } from "@/modules/asset/domain";

import type { ListAssetsInput } from "../schemas/list-assets.schema";

export function toAssetListQuery(input: ListAssetsInput): AssetListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    categoryId: input.categoryId,
    warehouseId: input.warehouseId,
  };
}
