import type { RepairStatus } from "../types";

export function canEditRepair(status: RepairStatus): boolean {
  return status === "PENDING";
}

export function canStartRepair(status: RepairStatus): boolean {
  return status === "PENDING";
}

export function canCompleteRepair(status: RepairStatus): boolean {
  return status === "IN_PROGRESS";
}

export function canCancelRepair(status: RepairStatus): boolean {
  return status === "PENDING" || status === "IN_PROGRESS";
}

export const STATUS_LABELS: Record<RepairStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
