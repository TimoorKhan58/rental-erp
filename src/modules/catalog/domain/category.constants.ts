export const CATEGORY_MODULE = "categories";
export const CATEGORY_ENTITY_NAME = "Category";

export const CATEGORY_SEARCH_FIELDS = ["name", "description"] as const;

export const CATEGORY_SORT_FIELDS = [
  "name",
  "isActive",
  "createdAt",
] as const;

export type CategorySortField = (typeof CATEGORY_SORT_FIELDS)[number];
