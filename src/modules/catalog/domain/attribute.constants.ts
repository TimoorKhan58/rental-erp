export const ATTRIBUTE_DATA_TYPES = ["TEXT", "NUMBER", "BOOLEAN"] as const;

export type AttributeDataType = (typeof ATTRIBUTE_DATA_TYPES)[number];

export const ATTRIBUTE_MODULE = "product-attributes";
export const ATTRIBUTE_ENTITY_NAME = "ProductAttribute";

export const ATTRIBUTE_SEARCH_FIELDS = ["name"] as const;

export const ATTRIBUTE_SORT_FIELDS = [
  "name",
  "dataType",
  "isActive",
  "createdAt",
] as const;

export type AttributeSortField = (typeof ATTRIBUTE_SORT_FIELDS)[number];
