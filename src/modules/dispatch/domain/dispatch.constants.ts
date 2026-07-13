export const DISPATCH_MODULE = "dispatches";
export const DISPATCH_ENTITY_NAME = "Dispatch";

export const DISPATCH_STATUSES = [
  "DRAFT",
  "READY",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const DELIVERY_METHODS = ["DELIVERY", "CUSTOMER_PICKUP"] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DISPATCH_SEARCH_FIELDS = [
  "dispatchNumber",
  "deliveryAddress",
  "remarks",
] as const;

export const DISPATCH_SORT_FIELDS = [
  "dispatchNumber",
  "dispatchDate",
  "status",
  "createdAt",
] as const;

export type DispatchSortField = (typeof DISPATCH_SORT_FIELDS)[number];

export const ELIGIBLE_RENTAL_ORDER_STATUSES = [
  "CONFIRMED",
  "RESERVED",
  "DISPATCHED",
  "ON_RENT",
  "PARTIALLY_RETURNED",
] as const;
