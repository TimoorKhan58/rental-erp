import type { PurchaseOrderItemResponse, PurchaseOrderStatus } from "../types";

export function canEditProcurement(status: PurchaseOrderStatus): boolean {
  return status === "DRAFT";
}

export function canApproveProcurement(status: PurchaseOrderStatus): boolean {
  return status === "DRAFT";
}

export function canReceiveProcurement(status: PurchaseOrderStatus): boolean {
  return status === "APPROVED" || status === "PARTIALLY_RECEIVED";
}

export function canCancelProcurement(
  status: PurchaseOrderStatus,
  items: PurchaseOrderItemResponse[],
): boolean {
  if (status === "RECEIVED" || status === "CANCELLED") {
    return false;
  }

  return !items.some((item) => item.receivedQuantity > 0);
}

export const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};
