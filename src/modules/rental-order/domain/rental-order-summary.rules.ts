import { RENTAL_ORDER_SEARCH_FIELDS, RENTAL_ORDER_STATUSES } from "./rental-order.constants";
import type { RentalOrder } from "./rental-order.entity";
import { computeLineTotal } from "./rental-order.rules";
import type { RentalOrderSummaryQuery } from "./rental-order-summary.query";
import type {
  RentalOrderSummaryProjection,
  RentalOrderSummaryReservationStatusCounts,
  RentalOrderSummaryResult,
  RentalOrderSummaryStats,
  RentalOrderSummaryStatusCounts,
} from "./rental-order-summary.types";

export function deriveReservationStatus(order: {
  items: Array<{ quantity: number; reservedQuantity: number }>;
}): "not-started" | "partial" | "complete" {
  const totalReserved = order.items.reduce(
    (sum, item) => sum + item.reservedQuantity,
    0,
  );

  if (totalReserved <= 0) {
    return "not-started";
  }

  if (order.items.every((item) => item.reservedQuantity >= item.quantity)) {
    return "complete";
  }

  return "partial";
}

export function matchesRentalOrderSummaryQuery(
  order: Pick<RentalOrder, "status" | "customerId" | "warehouseId" | "startDate" | "endDate" | "orderNumber" | "remarks">,
  query: RentalOrderSummaryQuery,
): boolean {
  if (query.status !== undefined && order.status !== query.status) {
    return false;
  }

  if (query.customerId !== undefined && order.customerId !== query.customerId) {
    return false;
  }

  if (query.warehouseId !== undefined && order.warehouseId !== query.warehouseId) {
    return false;
  }

  if (query.eventFrom !== undefined) {
    if (order.endDate.getTime() < query.eventFrom.getTime()) {
      return false;
    }
  }

  if (query.eventTo !== undefined) {
    if (order.startDate.getTime() > query.eventTo.getTime()) {
      return false;
    }
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = RENTAL_ORDER_SEARCH_FIELDS.some((field) => {
      if (field === "notes") {
        return order.remarks?.toLowerCase().includes(term) ?? false;
      }

      const value = order[field as keyof typeof order];
      return typeof value === "string" && value.toLowerCase().includes(term);
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterRentalOrdersForSummary(
  orders: RentalOrder[],
  query: RentalOrderSummaryQuery,
): RentalOrder[] {
  return orders.filter((order) => matchesRentalOrderSummaryQuery(order, query));
}

export function computeRentalOrderSummaryResult(
  orders: RentalOrderSummaryProjection[],
): RentalOrderSummaryResult {
  let totalRevenue = 0;
  let draftCount = 0;
  let confirmedCount = 0;
  let reservedCount = 0;
  let cancelledCount = 0;
  let pendingActionCount = 0;

  const statusCounts = Object.fromEntries(
    RENTAL_ORDER_STATUSES.map((status) => [status, 0]),
  ) as Omit<RentalOrderSummaryStatusCounts, "all">;

  const reservationStatusCounts: RentalOrderSummaryReservationStatusCounts = {
    all: orders.length,
    "not-started": 0,
    partial: 0,
    complete: 0,
  };

  for (const order of orders) {
    for (const item of order.items) {
      totalRevenue += computeLineTotal(
        item.quantity,
        item.dailyRate,
        item.numberOfDays,
      );
    }

    statusCounts[order.status] += 1;

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

    if (order.status !== "CANCELLED") {
      reservationStatusCounts[deriveReservationStatus(order)] += 1;
    }
  }

  const stats: RentalOrderSummaryStats = {
    totalOrders: orders.length,
    activeOrders: orders.length - cancelledCount,
    totalRevenue,
    draftCount,
    confirmedCount,
    reservedCount,
    cancelledCount,
    pendingActionCount,
  };

  return {
    stats,
    statusCounts: {
      all: orders.length,
      ...statusCounts,
    },
    reservationStatusCounts,
  };
}
