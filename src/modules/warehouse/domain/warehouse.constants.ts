export const WAREHOUSE_MODULE = "warehouses";
export const WAREHOUSE_ENTITY_NAME = "Warehouse";

export const WAREHOUSE_SEARCH_FIELDS = [
  "name",
  "warehouseCode",
  "description",
  "address",
  "contactPerson",
  "phone",
] as const;

export const WAREHOUSE_SORT_FIELDS = [
  "name",
  "warehouseCode",
  "contactPerson",
  "phone",
  "createdAt",
  "updatedAt",
  "isActive",
] as const;

export type WarehouseSortField = (typeof WAREHOUSE_SORT_FIELDS)[number];
