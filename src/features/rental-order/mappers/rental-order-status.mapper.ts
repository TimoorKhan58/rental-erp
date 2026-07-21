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

const NON_CANCELLABLE_STATUSES: RentalOrderStatus[] = [
  "RESERVED",
  "DISPATCHED",
  "ON_RENT",
  "PARTIALLY_RETURNED",
  "RETURNED",
  "COMPLETED",
  "CANCELLED",
];

export function canCancelRentalOrder(
  status: RentalOrderStatus,
  items: RentalOrderItemResponse[],
): boolean {
  if (NON_CANCELLABLE_STATUSES.includes(status)) {
    return false;
  }

  return !items.some((item) => item.reservedQuantity > 0);
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
