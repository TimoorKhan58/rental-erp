export const INVENTORY_MODULE = "inventory";
export const INVENTORY_ENTITY_NAME = "Inventory";

export const INVENTORY_SEARCH_FIELDS = ["productId", "warehouseId"] as const;

export const INVENTORY_SORT_FIELDS = [
  "quantityOnHand",
  "reservedQuantity",
  "minimumStock",
  "maximumStock",
  "createdAt",
  "updatedAt",
  "isActive",
] as const;

export type InventorySortField = (typeof INVENTORY_SORT_FIELDS)[number];
