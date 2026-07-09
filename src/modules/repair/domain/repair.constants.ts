export const REPAIR_MODULE = "repairs";
export const REPAIR_ENTITY_NAME = "Repair";

export const REPAIR_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const REPAIR_REFERENCE_TYPE = "REPAIR";

export const REPAIR_SEARCH_FIELDS = ["repairNumber", "remarks", "assignedTo"] as const;

export const REPAIR_SORT_FIELDS = [
  "repairNumber",
  "repairDate",
  "status",
  "createdAt",
] as const;

export type RepairSortField = (typeof REPAIR_SORT_FIELDS)[number];

export const COMPLETED_RETURN_STATUS = "COMPLETED" as const;
