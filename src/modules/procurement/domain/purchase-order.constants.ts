export const PURCHASE_ORDER_MODULE = "purchase-orders";
export const PURCHASE_ORDER_ENTITY_NAME = "PurchaseOrder";

export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_REFERENCE_TYPE = "PURCHASE_ORDER";

export const PURCHASE_ORDER_SEARCH_FIELDS = ["poNumber", "remarks"] as const;

export const PURCHASE_ORDER_SORT_FIELDS = [
  "poNumber",
  "orderDate",
  "expectedDate",
  "status",
  "createdAt",
] as const;

export type PurchaseOrderSortField = (typeof PURCHASE_ORDER_SORT_FIELDS)[number];
