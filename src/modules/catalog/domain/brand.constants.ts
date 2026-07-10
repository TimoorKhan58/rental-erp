export const BRAND_MODULE = "brands";
export const BRAND_ENTITY_NAME = "Brand";

export const BRAND_SEARCH_FIELDS = ["name", "description"] as const;

export const BRAND_SORT_FIELDS = ["name", "isActive", "createdAt"] as const;

export type BrandSortField = (typeof BRAND_SORT_FIELDS)[number];
