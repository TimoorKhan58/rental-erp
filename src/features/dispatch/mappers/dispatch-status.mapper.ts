import type { DispatchStatus } from "../types";

export function canEditDispatch(status: DispatchStatus): boolean {
  return status === "DRAFT";
}

export function canMarkDispatchReady(status: DispatchStatus): boolean {
  return status === "DRAFT";
}

export function canCompleteDispatch(status: DispatchStatus): boolean {
  return status === "READY";
}

export function canCancelDispatch(status: DispatchStatus): boolean {
  return status === "DRAFT" || status === "READY";
}

export const STATUS_LABELS: Record<DispatchStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  DELIVERY: "Delivery",
  CUSTOMER_PICKUP: "Customer pickup",
};
