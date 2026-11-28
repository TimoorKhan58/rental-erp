import { describe, expect, it } from "vitest";

import { describeChange, previousPeriod } from "./report-compare.mapper";

describe("previousPeriod", () => {
  it("is the same number of days, ending the day before", () => {
    expect(previousPeriod("2026-11-01", "2026-11-30")).toEqual({
      dateFrom: "2026-10-02",
      dateTo: "2026-10-31",
    });
    expect(previousPeriod("2026-11-20", "2026-11-20")).toEqual({
      dateFrom: "2026-11-19",
      dateTo: "2026-11-19",
    });
  });

  it("crosses a year end and a leap day", () => {
    expect(previousPeriod("2027-01-01", "2027-01-31")).toEqual({
      dateFrom: "2026-12-01",
      dateTo: "2026-12-31",
    });
    expect(previousPeriod("2028-03-01", "2028-03-10")).toEqual({
      dateFrom: "2028-02-20",
      dateTo: "2028-02-29",
    });
  });

  it("needs both dates, in order", () => {
    expect(previousPeriod(undefined, "2026-11-30")).toBeNull();
    expect(previousPeriod("2026-11-30", undefined)).toBeNull();
    expect(previousPeriod("2026-11-30", "2026-11-01")).toBeNull();
    expect(previousPeriod("soon", "later")).toBeNull();
  });
});

describe("describeChange", () => {
  it("says up or down in plain words", () => {
    expect(describeChange(118, 100)).toEqual({ text: "Up 18% on the time before", tone: "good" });
    expect(describeChange(80, 100)).toEqual({ text: "Down 20% on the time before", tone: "bad" });
  });

  it("treats rising costs as bad news", () => {
    expect(describeChange(150, 100, false)?.tone).toBe("bad");
    expect(describeChange(50, 100, false)?.tone).toBe("good");
  });

  it("handles nothing before, no change, and no data", () => {
    expect(describeChange(500, 0)?.tone).toBe("neutral");
    expect(describeChange(0, 0)).toBeNull();
    expect(describeChange(100, 100)).toEqual({ text: "Same as the time before", tone: "neutral" });
    expect(describeChange(Number.NaN, 100)).toBeNull();
  });
});
