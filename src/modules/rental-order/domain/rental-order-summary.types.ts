import type { RentalOrderStatus } from "./rental-order.constants";

export interface RentalOrderSummaryStats {
  totalOrders: number;
  activeOrders: number;
  totalRevenue: number;
  draftCount: number;
  confirmedCount: number;
  reservedCount: number;
  cancelledCount: number;
  pendingActionCount: number;
}

export type RentalOrderSummaryStatusCounts = Record<
  "all" | RentalOrderStatus,
  number
>;

export type RentalOrderSummaryReservationStatusCounts = Record<
  "all" | "not-started" | "partial" | "complete",
  number
>;

export interface RentalOrderSummaryResult {
  stats: RentalOrderSummaryStats;
  statusCounts: RentalOrderSummaryStatusCounts;
  reservationStatusCounts: RentalOrderSummaryReservationStatusCounts;
}

export interface RentalOrderSummaryProjection {
  status: RentalOrderStatus;
  items: Array<{
    quantity: number;
    dailyRate: number;
    numberOfDays: number;
    reservedQuantity: number;
  }>;
}
