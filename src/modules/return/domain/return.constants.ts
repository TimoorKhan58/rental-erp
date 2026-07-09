export const RETURN_MODULE = "returns";
export const RETURN_ENTITY_NAME = "Return";

export const RETURN_STATUSES = [
  "DRAFT",
  "RECEIVED",
  "INSPECTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_CONDITIONS = ["GOOD", "DAMAGED", "LOST"] as const;

export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export const RETURN_SEARCH_FIELDS = ["returnNumber", "remarks"] as const;

export const RETURN_SORT_FIELDS = [
  "returnNumber",
  "inspectionDate",
  "status",
  "createdAt",
] as const;

export type ReturnSortField = (typeof RETURN_SORT_FIELDS)[number];

export const COMPLETED_DISPATCH_STATUS = "COMPLETED" as const;
