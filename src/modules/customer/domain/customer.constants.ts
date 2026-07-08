export const CUSTOMER_MODULE = "customers";
export const CUSTOMER_ENTITY_NAME = "Customer";

export const CUSTOMER_SEARCH_FIELDS = ["name", "phone", "customerCode"] as const;

export const CUSTOMER_SORT_FIELDS = [
  "name",
  "customerCode",
  "phone",
  "createdAt",
  "updatedAt",
  "isActive",
] as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];
