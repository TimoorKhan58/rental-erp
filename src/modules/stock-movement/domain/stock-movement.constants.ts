export const STOCK_MOVEMENT_MODULE = "stock-movements";
export const STOCK_MOVEMENT_ENTITY_NAME = "StockMovement";

export const STOCK_MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "RESERVE",
  "RELEASE",
  "ADJUSTMENT",
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_SEARCH_FIELDS = [
  "referenceType",
  "referenceId",
  "remarks",
] as const;

export const STOCK_MOVEMENT_SORT_FIELDS = [
  "quantity",
  "previousQuantity",
  "newQuantity",
  "movementType",
  "createdAt",
] as const;

export type StockMovementSortField = (typeof STOCK_MOVEMENT_SORT_FIELDS)[number];
