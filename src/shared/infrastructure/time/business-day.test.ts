import { describe, expect, it } from "vitest";

import { assertStartNotInPast } from "@/modules/rental-order/domain/rental-order.rules";
import { resolveReportPeriod, startOfMonth } from "@/modules/reporting/domain/reporting.rules";

import { businessDateString, businessDay, isValidTimeZone } from "./business-day";

const KARACHI = "Asia/Karachi"; // UTC+5, no daylight saving

// 18 Nov 2026 00:30 in Karachi = 17 Nov 19:30 UTC.
const KARACHI_0030 = new Date("2026-11-17T19:30:00Z");
// 18 Nov 2026 23:30 in Karachi = 18 Nov 18:30 UTC.
const KARACHI_2330 = new Date("2026-11-18T18:30:00Z");
const NOV_17 = new Date("2026-11-17T00:00:00Z");
const NOV_18 = new Date("2026-11-18T00:00:00Z");

describe("businessDay (SaaS phase 4a)", () => {
  it("is the local date at 00:30 Karachi, while UTC is still the previous day", () => {
    expect(businessDay(KARACHI, KARACHI_0030)).toEqual(NOV_18);
    expect(businessDay("UTC", KARACHI_0030)).toEqual(NOV_17);
    expect(businessDateString(KARACHI, KARACHI_0030)).toBe("2026-11-18");
  });

  it("stays on the same local date at 23:30 Karachi", () => {
    expect(businessDay(KARACHI, KARACHI_2330)).toEqual(NOV_18);
  });

  it("handles a zone behind UTC and falls back to UTC for unknown zones", () => {
    expect(businessDay("America/New_York", new Date("2026-11-18T03:00:00Z"))).toEqual(NOV_17);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
    expect(businessDay("Mars/Base", KARACHI_0030)).toEqual(NOV_17);
  });
});

describe("rules that depend on today, in Karachi", () => {
  it("refuses an order starting yesterday at 00:30 (UTC alone would allow it)", () => {
    expect(() => assertStartNotInPast([NOV_17], businessDay(KARACHI, KARACHI_0030))).toThrow();
    expect(() => assertStartNotInPast([NOV_17], businessDay("UTC", KARACHI_0030))).not.toThrow();
  });

  it("accepts an order starting today at 00:30 and at 23:30", () => {
    expect(() => assertStartNotInPast([NOV_18], businessDay(KARACHI, KARACHI_0030))).not.toThrow();
    expect(() => assertStartNotInPast([NOV_18], businessDay(KARACHI, KARACHI_2330))).not.toThrow();
  });

  it("starts 'this month' on the local 1st just after midnight, and keeps now as the upper bound", () => {
    // 1 Dec 2026 00:30 in Karachi = 30 Nov 19:30 UTC.
    const now = new Date("2026-11-30T19:30:00Z");
    const period = resolveReportPeriod({}, now, businessDay(KARACHI, now));
    expect(period.dateFrom).toEqual(startOfMonth(new Date("2026-12-01T00:00:00Z")));
    expect(period.dateTo).toBe(now);
  });
});
