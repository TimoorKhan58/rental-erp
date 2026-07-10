export const ASSET_MODULE = "assets";
export const ASSET_ENTITY_NAME = "Asset";

export const ASSET_STATUSES = [
  "ACTIVE",
  "UNDER_MAINTENANCE",
  "TRANSFERRED",
  "DISPOSED",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_SEARCH_FIELDS = [
  "name",
  "assetCode",
  "serialNumber",
  "notes",
] as const;

export const ASSET_SORT_FIELDS = [
  "name",
  "assetCode",
  "purchaseDate",
  "purchaseCost",
  "currentBookValue",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export type AssetSortField = (typeof ASSET_SORT_FIELDS)[number];

/** Reference-only default categories for seeding or documentation. */
export const DEFAULT_ASSET_CATEGORIES = [
  "Vehicle",
  "Machinery",
  "Equipment",
  "Furniture",
  "IT Hardware",
  "Tools",
] as const;
