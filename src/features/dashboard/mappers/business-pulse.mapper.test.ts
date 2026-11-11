import { describe, expect, it } from "vitest";
import { toBusinessPulse } from "./business-pulse.mapper";
import type { LiveDashboardSummary } from "../types";

function baseSummary(
  overrides: Partial<LiveDashboardSummary> = {},
): LiveDashboardSummary {
  return {
    totalCustomers: 10,
    totalSuppliers: 2,
    totalProducts: 20,
    totalWarehouses: 1,
    inventoryValue: 100000,
    inventoryQuantity: 100,
    reservedQuantity: 40,
    availableQuantity: 60,
    rentalOrders: 15,
    confirmedOrders: 5,
    reservedOrders: 3,
    completedRentals: 7,
    dispatchesReady: 2,
    dispatchesInProgress: 1,
    pendingReturns: 4,
    repairsPending: 1,
    repairsInProgress: 0,
    maintenanceScheduled: 1,
    maintenanceInProgress: 0,
    openPurchaseOrders: 2,
    completedPurchaseOrders: 5,
    outstandingInvoices: 3,
    paidInvoices: 8,
    revenueThisMonth: 50000,
    paymentsThisMonth: 30000,
    averageRentalDuration: 2.5,
    ...overrides,
  };
}

describe("toBusinessPulse", () => {
  it("partitions live counters into OCC zones without inventing metrics", () => {
    const pulse = toBusinessPulse(baseSummary());

    expect(pulse.todayOps.map((item) => item.id)).toEqual([
      "ready-dispatch",
      "in-transit",
      "pending-returns",
      "asset-work",
    ]);
    expect(pulse.inventoryHealth.map((item) => item.id)).toEqual([
      "on-hand",
      "fleet-out",
      "available",
    ]);
    expect(pulse.upcoming.map((item) => item.id)).toEqual([
      "reserved-orders",
      "confirmed-orders",
      "open-pos",
    ]);
    expect(pulse.pulseMetrics).toHaveLength(4);
    expect(pulse.attention.length).toBeGreaterThan(0);
    expect(pulse.attentionCount).toBe(pulse.attention.length);
  });

  it("navigates unpaid-invoice callouts with the paymentStatus filter", () => {
    const pulse = toBusinessPulse(baseSummary());

    const arAttention = pulse.attention.find((item) => item.id === "ar");
    expect(arAttention?.href).toBe("/rental-invoices?paymentStatus=unpaid");

    const arMetric = pulse.pulseMetrics.find((item) => item.id === "outstanding-ar");
    expect(arMetric?.href).toBe("/rental-invoices?paymentStatus=unpaid");
  });

  it("marks stock-out as critical attention when nothing is available", () => {
    const pulse = toBusinessPulse(
      baseSummary({
        availableQuantity: 0,
        inventoryQuantity: 50,
        outstandingInvoices: 0,
        revenueThisMonth: 0,
        paymentsThisMonth: 0,
        dispatchesReady: 0,
        dispatchesInProgress: 0,
        pendingReturns: 0,
        repairsPending: 0,
        repairsInProgress: 0,
        maintenanceScheduled: 0,
        maintenanceInProgress: 0,
        openPurchaseOrders: 0,
      }),
    );

    const stockOut = pulse.attention.find((item) => item.id === "stock-out");
    expect(stockOut).toBeDefined();
    expect(stockOut?.href).toBe("/inventory?stockStatus=out-of-stock");
    expect(
      pulse.inventoryHealth.find((item) => item.id === "available")?.tone,
    ).toBe("critical");
  });

  it("returns a clear headline when there are no attention items", () => {
    const pulse = toBusinessPulse(
      baseSummary({
        outstandingInvoices: 0,
        revenueThisMonth: 0,
        paymentsThisMonth: 0,
        dispatchesReady: 0,
        dispatchesInProgress: 0,
        pendingReturns: 0,
        repairsPending: 0,
        repairsInProgress: 0,
        maintenanceScheduled: 0,
        maintenanceInProgress: 0,
        openPurchaseOrders: 0,
        availableQuantity: 10,
      }),
    );

    expect(pulse.attention).toHaveLength(0);
    expect(pulse.headline.toLowerCase()).toContain("clear");
  });
});
