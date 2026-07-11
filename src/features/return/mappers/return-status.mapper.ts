import type { ReturnStatus } from "../types";

export function canEditReturn(status: ReturnStatus): boolean {
  return status === "DRAFT";
}

export function canReceiveReturn(status: ReturnStatus): boolean {
  return status === "DRAFT";
}

export function canInspectReturn(status: ReturnStatus): boolean {
  return status === "RECEIVED";
}

export function canCompleteReturn(status: ReturnStatus): boolean {
  return status === "INSPECTED";
}

export function canCancelReturn(status: ReturnStatus): boolean {
  return status === "DRAFT" || status === "RECEIVED" || status === "INSPECTED";
}

export const STATUS_LABELS: Record<ReturnStatus, string> = {
  DRAFT: "Draft",
  RECEIVED: "Received",
  INSPECTED: "Inspected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
