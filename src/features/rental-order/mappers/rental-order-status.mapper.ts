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
  if (status === "RESERVED" || status === "CANCELLED") {
    return false;
  }

  return !items.some((item) => item.reservedQuantity > 0);
}

export const STATUS_LABELS: Record<RentalOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  RESERVED: "Reserved",
  CANCELLED: "Cancelled",
};

export const RESERVATION_LABELS: Record<string, string> = {
  "not-started": "Not reserved",
  partial: "Partially reserved",
  complete: "Fully reserved",
};
