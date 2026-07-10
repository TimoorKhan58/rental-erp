export const PRODUCT_MODULE = "products";
export const PRODUCT_ENTITY_NAME = "Product";

export const PRODUCT_SEARCH_FIELDS = [
  "name",
  "productCode",
  "description",
  "unit",
] as const;

export const PRODUCT_SORT_FIELDS = [
  "name",
  "productCode",
  "unit",
  "rentalRate",
  "replacementCost",
  "categoryId",
  "brandId",
  "createdAt",
  "updatedAt",
  "isActive",
] as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];
