export const TAG_MODULE = "product-tags";
export const TAG_ENTITY_NAME = "ProductTag";

export const TAG_SEARCH_FIELDS = ["name", "color"] as const;

export const TAG_SORT_FIELDS = ["name", "isActive", "createdAt"] as const;

export type TagSortField = (typeof TAG_SORT_FIELDS)[number];
