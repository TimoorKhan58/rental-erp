import {
  calculateOrderTotalFromItems,
  calculateRentalDays,
  deriveReservationStatus,
} from "./rental-order-totals.mapper";
import type { RentalOrderResponse, RentalOrderStatus } from "../types";

export type RentalOrderSummaryStats = {
  totalOrders: number;
  activeOrders: number;
  totalRevenue: number;
  draftCount: number;
  confirmedCount: number;
  reservedCount: number;
  cancelledCount: number;
  pendingActionCount: number;
};

export function computeRentalOrderSummary(
  orders: RentalOrderResponse[],
): RentalOrderSummaryStats {
  let totalRevenue = 0;
  let draftCount = 0;
  let confirmedCount = 0;
  let reservedCount = 0;
  let cancelledCount = 0;
  let pendingActionCount = 0;

  for (const order of orders) {
    totalRevenue += calculateOrderTotalFromItems(order.items);

    switch (order.status) {
      case "DRAFT":
        draftCount += 1;
        pendingActionCount += 1;
        break;
      case "CONFIRMED":
        confirmedCount += 1;
        pendingActionCount += 1;
        break;
      case "RESERVED":
        reservedCount += 1;
        break;
      case "CANCELLED":
        cancelledCount += 1;
        break;
    }
  }

  return {
    totalOrders: orders.length,
    activeOrders: orders.length - cancelledCount,
    totalRevenue,
    draftCount,
    confirmedCount,
    reservedCount,
    cancelledCount,
    pendingActionCount,
  };
}

export function computeOrderStatusCounts(
  orders: RentalOrderResponse[],
): Partial<Record<"all" | RentalOrderStatus, number>> {
  const counts: Partial<Record<"all" | RentalOrderStatus, number>> = {
    all: orders.length,
    DRAFT: 0,
    CONFIRMED: 0,
    RESERVED: 0,
    DISPATCHED: 0,
    ON_RENT: 0,
    PARTIALLY_RETURNED: 0,
    RETURNED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const order of orders) {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
  }

  return counts;
}

export function computeReservationStatusCounts(
  orders: RentalOrderResponse[],
): Partial<Record<"all" | "not-started" | "partial" | "complete", number>> {
  const counts = {
    all: orders.length,
    "not-started": 0,
    partial: 0,
    complete: 0,
  };

  for (const order of orders) {
    if (order.status === "CANCELLED") {
      continue;
    }

    counts[deriveReservationStatus(order)] += 1;
  }

  return counts;
}

export function getOrderReservedUnits(order: RentalOrderResponse): {
  reserved: number;
  total: number;
} {
  return {
    reserved: order.items.reduce((sum, item) => sum + item.reservedQuantity, 0),
    total: order.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
