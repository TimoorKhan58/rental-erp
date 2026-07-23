import type { RentalOrderItemResponse } from "../types";

/**
 * Rental billing days for views/forms:
 * - Same deliver/return date → 1 day
 * - Return within 24 hours → 1 day
 * - Longer periods → ceil of elapsed 24-hour blocks (minimum 1)
 */
export function calculateRentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end.getTime() - start.getTime();

  if (diffMs < 0) {
    return 1;
  }

  if (diffMs <= msPerDay) {
    return 1;
  }

  return Math.ceil(diffMs / msPerDay);
}

export function getLineRentalDays(item: {
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
}): number {
  if (item.numberOfDays !== undefined) {
    return item.numberOfDays;
  }

  if (item.startDate && item.endDate) {
    return calculateRentalDays(item.startDate, item.endDate);
  }

  return 1;
}

export function calculateLineSubtotal(
  item: { quantity: number; dailyRate: number; startDate?: string; endDate?: string; numberOfDays?: number },
  fallbackRentalDays?: number,
): number {
  const rentalDays =
    fallbackRentalDays ?? getLineRentalDays(item);
  return item.quantity * item.dailyRate * rentalDays;
}

export function calculateOrderTotal(
  items: Array<{
    quantity: number;
    dailyRate: number;
    startDate?: string;
    endDate?: string;
    numberOfDays?: number;
  }>,
  fallbackRentalDays?: number,
): number {
  return items.reduce(
    (sum, item) => sum + calculateLineSubtotal(item, fallbackRentalDays),
    0,
  );
}

export function calculateOrderTotalFromItems(items: RentalOrderItemResponse[]): number {
  return items.reduce(
    (sum, item) =>
      sum + item.quantity * item.dailyRate * item.numberOfDays,
    0,
  );
}

export function getRemainingReserveQuantity(item: RentalOrderItemResponse): number {
  return Math.max(0, item.quantity - item.reservedQuantity);
}

export function deriveReservationStatus(order: {
  items: RentalOrderItemResponse[];
}): "not-started" | "partial" | "complete" {
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
  order: { items: RentalOrderItemResponse[] },
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
