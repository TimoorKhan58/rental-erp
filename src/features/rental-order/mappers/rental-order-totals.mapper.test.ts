import { describe, expect, it } from "vitest";

import {
  calculateOrderRentalDays,
  calculateRentalDays,
} from "./rental-order-totals.mapper";

describe("calculateOrderRentalDays (QA-013)", () => {
  it("shows the billed days stored on the lines", () => {
    // Saved under the older inclusive rule: 2–3 October billed as 2 days.
    expect(
      calculateOrderRentalDays({
        startDate: "2026-10-02T00:00:00.000Z",
        endDate: "2026-10-03T00:00:00.000Z",
        items: [{ numberOfDays: 2 }],
      }),
    ).toBe(2);

    // The date-only rule would say 1 day for the same dates.
    expect(
      calculateRentalDays("2026-10-02T00:00:00.000Z", "2026-10-03T00:00:00.000Z"),
    ).toBe(1);
  });

  it("uses the longest line when lines have different periods", () => {
    expect(
      calculateOrderRentalDays({
        startDate: "2026-12-01T00:00:00.000Z",
        endDate: "2026-12-05T00:00:00.000Z",
        items: [{ numberOfDays: 2 }, { numberOfDays: 4 }],
      }),
    ).toBe(4);
  });

  it("falls back to the order dates when there are no lines", () => {
    expect(
      calculateOrderRentalDays({
        startDate: "2026-12-01T00:00:00.000Z",
        endDate: "2026-12-03T00:00:00.000Z",
      }),
    ).toBe(2);
  });
});
