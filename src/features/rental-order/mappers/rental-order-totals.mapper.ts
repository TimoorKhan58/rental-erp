import type { RentalOrderItemResponse, RentalOrderResponse, RentalReservationFilter } from "../types";

export function calculateRentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();

  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function calculateLineSubtotal(
  item: { quantity: number; dailyRate: number },
  rentalDays: number,
): number {
  return item.quantity * item.dailyRate * rentalDays;
}

export function calculateOrderTotal(
  items: Array<{ quantity: number; dailyRate: number }>,
  rentalDays: number,
): number {
  return items.reduce((sum, item) => sum + calculateLineSubtotal(item, rentalDays), 0);
}

export function getRemainingReserveQuantity(item: RentalOrderItemResponse): number {
  return Math.max(0, item.quantity - item.reservedQuantity);
}

export function deriveReservationStatus(order: RentalOrderResponse): RentalReservationFilter {
  const totalReserved = order.items.reduce((sum, item) => sum + item.reservedQuantity, 0);

  if (totalReserved <= 0) {
    return "not-started";
  }

  if (order.items.every((item) => item.reservedQuantity >= item.quantity)) {
    return "complete";
  }

  return "partial";
}

export function matchesReservationFilter(
  order: RentalOrderResponse,
  filter: string | undefined,
): boolean {
  if (!filter || filter === "all") {
    return true;
  }

  return deriveReservationStatus(order) === filter;
}

export function matchesStartDateRange(
  startDate: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const timestamp = new Date(startDate).getTime();

  if (from && timestamp < new Date(from).getTime()) {
    return false;
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    if (timestamp > end.getTime()) {
      return false;
    }
  }

  return true;
}
