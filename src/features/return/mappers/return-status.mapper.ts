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

/**
 * UI eligibility for a "Create return" CTA on a rental order.
 * Domain create still requires a COMPLETED dispatch and remaining quantity.
 * RETURN_PENDING is not a rental-order status.
 */
export const RENTAL_ORDER_STATUSES_ELIGIBLE_FOR_RETURN_CREATE = [
  "DISPATCHED",
  "ON_RENT",
  "PARTIALLY_RETURNED",
  "RETURNED",
] as const;

export function isRentalOrderEligibleForReturnCreate(status: string): boolean {
  return (RENTAL_ORDER_STATUSES_ELIGIBLE_FOR_RETURN_CREATE as readonly string[]).includes(
    status,
  );
}
