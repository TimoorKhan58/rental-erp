import type { AssetCategoryListQuery } from "@/modules/asset/domain";

import type { ListAssetCategoriesInput } from "../schemas/list-asset-categories.schema";

export function toAssetCategoryListQuery(
  input: ListAssetCategoriesInput,
): AssetCategoryListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
