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

export const STATUS_LABELS: Record<RentalOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  RESERVED: "Reserved",
  DISPATCHED: "Dispatched",
  ON_RENT: "On rent",
  PARTIALLY_RETURNED: "Partially returned",
  RETURNED: "Returned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const RESERVATION_LABELS: Record<string, string> = {
  "not-started": "Not reserved",
  partial: "Partially reserved",
  complete: "Fully reserved",
};
