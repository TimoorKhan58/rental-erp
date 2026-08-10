import { describe, expect, it } from "vitest";

import {
  ANALYTICS_UPCOMING_HORIZON_DAYS,
  addUtcDays,
  isActiveRentalStatus,
  isBookedRentalValueStatus,
  isOrderedProcurementValueStatus,
  isOverdueRental,
  isOverdueRentalStatus,
  isUpcomingRental,
  isUpcomingRentalStatus,
  startOfUtcDay,
} from "./reporting.rules";

describe("analytics frozen semantics (BD-1..BD-9 rules)", () => {
  it("BD-1 excludes DRAFT and CANCELLED from booked rental value", () => {
    expect(isBookedRentalValueStatus("DRAFT")).toBe(false);
    expect(isBookedRentalValueStatus("CANCELLED")).toBe(false);
    expect(isBookedRentalValueStatus("CONFIRMED")).toBe(true);
    expect(isBookedRentalValueStatus("COMPLETED")).toBe(true);
    expect(isBookedRentalValueStatus("RESERVED")).toBe(true);
  });

  it("BD-2 active rental is CONFIRMED or RESERVED only", () => {
    expect(isActiveRentalStatus("CONFIRMED")).toBe(true);
    expect(isActiveRentalStatus("RESERVED")).toBe(true);
    expect(isActiveRentalStatus("DRAFT")).toBe(false);
    expect(isActiveRentalStatus("ON_RENT")).toBe(false);
    expect(isActiveRentalStatus("DISPATCHED")).toBe(false);
    expect(isActiveRentalStatus("COMPLETED")).toBe(false);
  });

  it("BD-3 upcoming uses 14-day UTC horizon and CONFIRMED|RESERVED", () => {
    expect(ANALYTICS_UPCOMING_HORIZON_DAYS).toBe(14);
    expect(isUpcomingRentalStatus("CONFIRMED")).toBe(true);
    expect(isUpcomingRentalStatus("DRAFT")).toBe(false);

    const reference = new Date("2026-08-10T15:00:00.000Z");
    const today = startOfUtcDay(reference);
    const inHorizon = addUtcDays(today, 7);
    const onBoundary = addUtcDays(today, 14);
    const pastHorizon = addUtcDays(today, 15);
    const yesterday = addUtcDays(today, -1);

    expect(isUpcomingRental("CONFIRMED", inHorizon, reference)).toBe(true);
    expect(isUpcomingRental("RESERVED", onBoundary, reference)).toBe(true);
    expect(isUpcomingRental("CONFIRMED", pastHorizon, reference)).toBe(false);
    expect(isUpcomingRental("CONFIRMED", yesterday, reference)).toBe(false);
    expect(isUpcomingRental("DRAFT", inHorizon, reference)).toBe(false);
    expect(isUpcomingRental("COMPLETED", inHorizon, reference)).toBe(false);
  });

  it("BD-4 overdue excludes COMPLETED, CANCELLED, DRAFT", () => {
    expect(isOverdueRentalStatus("RESERVED")).toBe(true);
    expect(isOverdueRentalStatus("COMPLETED")).toBe(false);
    expect(isOverdueRentalStatus("CANCELLED")).toBe(false);
    expect(isOverdueRentalStatus("DRAFT")).toBe(false);

    const reference = new Date("2026-08-10T12:00:00.000Z");
    const today = startOfUtcDay(reference);
    const yesterday = addUtcDays(today, -1);

    expect(isOverdueRental("RESERVED", yesterday, reference)).toBe(true);
    expect(isOverdueRental("RESERVED", today, reference)).toBe(false);
    expect(isOverdueRental("COMPLETED", yesterday, reference)).toBe(false);
  });

  it("BD-9 ordered procurement excludes DRAFT and CANCELLED", () => {
    expect(isOrderedProcurementValueStatus("APPROVED")).toBe(true);
    expect(isOrderedProcurementValueStatus("RECEIVED")).toBe(true);
    expect(isOrderedProcurementValueStatus("DRAFT")).toBe(false);
    expect(isOrderedProcurementValueStatus("CANCELLED")).toBe(false);
  });
});
