export const SUPPLIER_MODULE = "suppliers";
export const SUPPLIER_ENTITY_NAME = "Supplier";

export const SUPPLIER_SEARCH_FIELDS = ["name", "phone", "supplierCode", "email"] as const;

export const SUPPLIER_SORT_FIELDS = [
  "name",
  "supplierCode",
  "phone",
  "email",
  "createdAt",
  "updatedAt",
  "isActive",
] as const;

export type SupplierSortField = (typeof SUPPLIER_SORT_FIELDS)[number];
