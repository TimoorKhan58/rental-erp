import { describe, expect, it } from "vitest";

import {
  getDefaultAnalyticsDateRange,
  isValidAnalyticsDateRange,
  toUtcDateInputValue,
} from "./analytics-date-range";

describe("analytics date range helpers", () => {
  it("formats UTC calendar dates for date inputs", () => {
    expect(toUtcDateInputValue(new Date("2026-07-15T12:30:00.000Z"))).toBe(
      "2026-07-15",
    );
  });

  it("defaults to UTC start-of-month through UTC today", () => {
    const reference = new Date("2026-07-15T18:00:00.000Z");
    expect(getDefaultAnalyticsDateRange(reference)).toEqual({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-15",
    });
  });

  it("rejects inverted ranges and allows open/equal ranges", () => {
    expect(isValidAnalyticsDateRange("2026-08-01", "2026-07-01")).toBe(false);
    expect(isValidAnalyticsDateRange("2026-07-01", "2026-07-31")).toBe(true);
    expect(isValidAnalyticsDateRange("2026-07-01", "2026-07-01")).toBe(true);
    expect(isValidAnalyticsDateRange("2026-07-01", undefined)).toBe(true);
    expect(isValidAnalyticsDateRange(undefined, "2026-07-01")).toBe(true);
  });
});
