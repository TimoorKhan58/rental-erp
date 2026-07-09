export const MAINTENANCE_MODULE = "maintenances";
export const MAINTENANCE_ENTITY_NAME = "Maintenance";

export const MAINTENANCE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_SERVICE_TYPES = [
  "PREVENTIVE",
  "CLEANING",
  "INSPECTION",
  "CALIBRATION",
  "LUBRICATION",
  "OTHER",
] as const;

export type MaintenanceServiceType = (typeof MAINTENANCE_SERVICE_TYPES)[number];

export const MAINTENANCE_REFERENCE_TYPE = "MAINTENANCE";

export const MAINTENANCE_SEARCH_FIELDS = [
  "maintenanceNumber",
  "notes",
  "technician",
  "vendor",
] as const;

export const MAINTENANCE_SORT_FIELDS = [
  "maintenanceNumber",
  "scheduledDate",
  "status",
  "createdAt",
] as const;

export type MaintenanceSortField = (typeof MAINTENANCE_SORT_FIELDS)[number];
