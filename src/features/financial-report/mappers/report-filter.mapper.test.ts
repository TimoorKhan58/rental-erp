import { describe, expect, it } from "vitest";

import { compactActiveFilters, dateRangeFilterChip } from "./report-filter.mapper";

describe("dateRangeFilterChip", () => {
  it("returns null when no dates are set", () => {
    expect(dateRangeFilterChip(undefined, undefined, "Booking date", () => undefined)).toBeNull();
  });

  it("labels the actual date field used by the report", () => {
    const chip = dateRangeFilterChip("2026-09-01", "2026-09-13", "Booking date", () => undefined);
    expect(chip?.label).toBe("Booking date: 2026-09-01 – 2026-09-13");
  });
});

describe("compactActiveFilters", () => {
  it("drops null chips", () => {
    expect(
      compactActiveFilters([
        null,
        { id: "status", label: "Status: DRAFT", onClear: () => undefined },
      ]),
    ).toHaveLength(1);
  });
});
