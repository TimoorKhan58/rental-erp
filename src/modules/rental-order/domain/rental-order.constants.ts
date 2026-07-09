export const RENTAL_ORDER_MODULE = "rental-orders";
export const RENTAL_ORDER_ENTITY_NAME = "RentalOrder";

export const RENTAL_ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "RESERVED",
  "CANCELLED",
] as const;

export type RentalOrderStatus = (typeof RENTAL_ORDER_STATUSES)[number];

export const RENTAL_ORDER_REFERENCE_TYPE = "RENTAL_ORDER";

export const RENTAL_ORDER_SEARCH_FIELDS = ["orderNumber", "notes"] as const;

export const RENTAL_ORDER_SORT_FIELDS = [
  "orderNumber",
  "eventStartDate",
  "eventEndDate",
  "status",
  "createdAt",
] as const;

export type RentalOrderSortField = (typeof RENTAL_ORDER_SORT_FIELDS)[number];
