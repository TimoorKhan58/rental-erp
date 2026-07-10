import { describe, expect, it } from "vitest";

import {
  calculateAccumulatedDepreciation,
  calculateBookValue,
  calculateMonthlyDepreciation,
  generateDepreciationSchedule,
} from "@/modules/asset/domain";

describe("calculateMonthlyDepreciation", () => {
  it("calculates straight-line monthly depreciation", () => {
    const monthly = calculateMonthlyDepreciation(120000, 20000, 24);

    expect(monthly).toBe(4166.666666666667);
  });

  it("returns zero when useful life is zero", () => {
    expect(calculateMonthlyDepreciation(100000, 10000, 0)).toBe(0);
  });

  it("returns zero when purchase equals residual", () => {
    expect(calculateMonthlyDepreciation(50000, 50000, 60)).toBe(0);
  });

  it("handles zero residual value", () => {
    const monthly = calculateMonthlyDepreciation(60000, 0, 12);

    expect(monthly).toBe(5000);
  });

  it("handles negative depreciable amount as zero", () => {
    const monthly = calculateMonthlyDepreciation(10000, 15000, 12);

    expect(monthly).toBe(0);
  });
});

describe("calculateAccumulatedDepreciation", () => {
  it("accumulates depreciation by elapsed months", () => {
    const purchaseDate = new Date("2025-01-15");
    const asOfDate = new Date("2025-04-15");
    const monthly = 1000;

    const accumulated = calculateAccumulatedDepreciation(
      purchaseDate,
      monthly,
      asOfDate,
    );

    expect(accumulated).toBe(3000);
  });

  it("returns zero when as-of date is before purchase", () => {
    const purchaseDate = new Date("2025-06-01");
    const asOfDate = new Date("2025-01-01");

    expect(
      calculateAccumulatedDepreciation(purchaseDate, 1000, asOfDate),
    ).toBe(0);
  });

  it("returns zero for same month", () => {
    const date = new Date("2025-06-15");

    expect(calculateAccumulatedDepreciation(date, 1000, date)).toBe(0);
  });

  it("handles year boundary", () => {
    const purchaseDate = new Date("2024-11-01");
    const asOfDate = new Date("2025-02-01");

    expect(
      calculateAccumulatedDepreciation(purchaseDate, 500, asOfDate),
    ).toBe(1500);
  });
});

describe("calculateBookValue", () => {
  it("subtracts accumulated depreciation from purchase cost", () => {
    expect(calculateBookValue(100000, 20000, 10000)).toBe(80000);
  });

  it("floors book value at residual", () => {
    expect(calculateBookValue(100000, 95000, 10000)).toBe(10000);
  });

  it("returns purchase cost when no depreciation", () => {
    expect(calculateBookValue(50000, 0, 5000)).toBe(50000);
  });

  it("returns residual when fully depreciated", () => {
    expect(calculateBookValue(50000, 50000, 5000)).toBe(5000);
  });

  it("handles zero residual floor", () => {
    expect(calculateBookValue(10000, 12000, 0)).toBe(0);
  });
});

describe("generateDepreciationSchedule", () => {
  it("generates schedule for full useful life", () => {
    const schedule = generateDepreciationSchedule(
      new Date("2025-01-01"),
      12000,
      0,
      12,
    );

    expect(schedule).toHaveLength(12);
    expect(schedule[0]?.month).toBe(1);
    expect(schedule[11]?.bookValue).toBe(0);
  });

  it("stops early when book value reaches residual", () => {
    const schedule = generateDepreciationSchedule(
      new Date("2025-01-01"),
      10000,
      5000,
      24,
    );

    expect(schedule.length).toBeLessThanOrEqual(24);
    expect(schedule[schedule.length - 1]?.bookValue).toBe(5000);
  });

  it("includes monthly depreciation in each entry", () => {
    const schedule = generateDepreciationSchedule(
      new Date("2025-01-01"),
      60000,
      0,
      12,
    );

    expect(schedule[0]?.monthlyDepreciation).toBe(5000);
    expect(schedule[0]?.accumulatedDepreciation).toBe(5000);
  });

  it("increments month numbers sequentially", () => {
    const schedule = generateDepreciationSchedule(
      new Date("2025-01-01"),
      24000,
      0,
      6,
    );

    expect(schedule.map((entry) => entry.month)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("sets dates by adding months from purchase date", () => {
    const purchaseDate = new Date("2025-03-15");
    const schedule = generateDepreciationSchedule(purchaseDate, 12000, 0, 2);

    expect(schedule[0]?.date.getMonth()).toBe(3);
    expect(schedule[1]?.date.getMonth()).toBe(4);
  });

  it("handles zero useful life", () => {
    const schedule = generateDepreciationSchedule(
      new Date("2025-01-01"),
      10000,
      0,
      0,
    );

    expect(schedule).toHaveLength(0);
  });
});
