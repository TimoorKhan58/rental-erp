import type { MaintenanceServiceType, MaintenanceStatus } from "../types";

export function canEditMaintenance(status: MaintenanceStatus): boolean {
  return status === "SCHEDULED";
}

export function canStartMaintenance(status: MaintenanceStatus): boolean {
  return status === "SCHEDULED";
}

export function canCompleteMaintenance(status: MaintenanceStatus): boolean {
  return status === "IN_PROGRESS";
}

export function canCancelMaintenance(status: MaintenanceStatus): boolean {
  return status === "SCHEDULED" || status === "IN_PROGRESS";
}

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const SERVICE_TYPE_LABELS: Record<MaintenanceServiceType, string> = {
  PREVENTIVE: "Preventive",
  CLEANING: "Cleaning",
  INSPECTION: "Inspection",
  CALIBRATION: "Calibration",
  LUBRICATION: "Lubrication",
  OTHER: "Other",
};
