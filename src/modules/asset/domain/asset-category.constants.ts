export const ASSET_CATEGORY_MODULE = "asset-categories";
export const ASSET_CATEGORY_ENTITY_NAME = "AssetCategory";

export const ASSET_CATEGORY_SEARCH_FIELDS = ["name", "description"] as const;

export const ASSET_CATEGORY_SORT_FIELDS = [
  "name",
  "createdAt",
  "updatedAt",
  "isActive",
] as const;

export type AssetCategorySortField = (typeof ASSET_CATEGORY_SORT_FIELDS)[number];
