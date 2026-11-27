import type { RentalOrderItemResponse, RentalOrderStatus } from "../types";

export function canEditRentalOrder(status: RentalOrderStatus): boolean {
  return status === "DRAFT";
}

export function canConfirmRentalOrder(status: RentalOrderStatus): boolean {
  return status === "DRAFT";
}

export function canReserveRentalOrder(status: RentalOrderStatus): boolean {
  return status === "CONFIRMED";
}

export function canCancelRentalOrder(
  status: RentalOrderStatus,
  items: RentalOrderItemResponse[],
): boolean {
  void items;
  return (
    status === "DRAFT" || status === "CONFIRMED" || status === "RESERVED"
  );
}

/**
 * One set of order status words, used on every screen (UI redesign,
 * see the design system board). Plain words a shop owner would say.
 */
export const STATUS_LABELS: Record<RentalOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Booked",
  RESERVED: "Items held",
  DISPATCHED: "Sent out",
  ON_RENT: "With customer",
  PARTIALLY_RETURNED: "Partly back",
  RETURNED: "Back",
  COMPLETED: "Finished",
  CANCELLED: "Cancelled",
};

export const RESERVATION_LABELS: Record<string, string> = {
  "not-started": "Not reserved",
  partial: "Partially reserved",
  complete: "Fully reserved",
};
