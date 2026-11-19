import { describe, expect, it } from "vitest";

import { computeRentalOrderSummaryResult } from "@/modules/rental-order/domain/rental-order-summary.rules";

import { endDateAfterStart } from "./rental-order-form";

/** Fixes from the on-screen test run of a new company (QA Big Rentals). */
describe("on-screen test fixes", () => {
  it("moves the end date to the day after a start that passed it", () => {
    expect(endDateAfterStart("2026-11-28T00:00:00.000Z", "2026-11-20T00:00:00.000Z")).toBe(
      "2026-11-29T00:00:00.000Z",
    );
  });

  it("leaves a valid end date alone", () => {
    expect(endDateAfterStart("2026-11-28T00:00:00.000Z", "2026-11-28T00:00:00.000Z")).toBeNull();
    expect(endDateAfterStart("2026-11-28T00:00:00.000Z", "2026-11-30T00:00:00.000Z")).toBeNull();
    expect(endDateAfterStart(undefined, "2026-11-30T00:00:00.000Z")).toBeNull();
  });

  it("does not count cancelled orders in the pipeline value", () => {
    const line = { quantity: 300, dailyRate: 25, numberOfDays: 1, reservedQuantity: 0 };
    const result = computeRentalOrderSummaryResult([
      { status: "COMPLETED", items: [line] },
      { status: "CANCELLED", items: [line] },
    ]);
    expect(result.stats.activeOrders).toBe(1);
    expect(result.stats.totalRevenue).toBe(7500);
  });
});
