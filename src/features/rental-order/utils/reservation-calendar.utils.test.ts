import { describe, expect, it } from "vitest";
import type { RentalOrderResponse } from "../types";
import {
  eventsOverlappingDay,
  formatCalendarDateParam,
  parseCalendarDateParam,
  shiftAnchor,
  toCalendarEvents,
} from "./reservation-calendar.utils";

function buildOrder(
  overrides: Partial<RentalOrderResponse> = {},
): RentalOrderResponse {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    orderNumber: "RO-1001",
    customerId: "00000000-0000-4000-8000-000000000002",
    warehouseId: "00000000-0000-4000-8000-000000000003",
    status: "RESERVED",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    remarks: null,
    items: [],
    createdById: "00000000-0000-4000-8000-000000000004",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("reservation calendar utils", () => {
  it("hides cancelled orders unless includeCancelled is set", () => {
    const names = new Map([["00000000-0000-4000-8000-000000000002", "Ayesha"]]);
    const cancelled = buildOrder({ status: "CANCELLED" });

    expect(toCalendarEvents([cancelled], names)).toHaveLength(0);
    expect(
      toCalendarEvents([cancelled], names, { includeCancelled: true }),
    ).toHaveLength(1);
  });

  it("uses Unknown customer when the lookup misses", () => {
    const [event] = toCalendarEvents([buildOrder()], new Map());
    expect(event.customerLabel).toBe("Unknown customer");
  });

  it("treats the event window as inclusive calendar days", () => {
    const [event] = toCalendarEvents(
      [buildOrder()],
      new Map([["00000000-0000-4000-8000-000000000002", "Ayesha"]]),
    );

    expect(eventsOverlappingDay([event], new Date(2026, 8, 10))).toHaveLength(1);
    expect(eventsOverlappingDay([event], new Date(2026, 8, 12))).toHaveLength(1);
    expect(eventsOverlappingDay([event], new Date(2026, 8, 13))).toHaveLength(0);
  });

  it("shifts week and month anchors across year boundaries", () => {
    const lateDecember = new Date(2026, 11, 28);
    const earlyJanuary = new Date(2027, 0, 4);

    expect(shiftAnchor(lateDecember, "week", 1).getFullYear()).toBe(2027);
    expect(shiftAnchor(earlyJanuary, "week", -1).getFullYear()).toBe(2026);
    expect(shiftAnchor(new Date(2026, 11, 15), "month", 1).getMonth()).toBe(0);
    expect(shiftAnchor(new Date(2027, 0, 15), "month", -1).getMonth()).toBe(11);
  });

  it("round-trips local calendar date params without inventing a timezone", () => {
    const parsed = parseCalendarDateParam("2026-01-02");
    expect(formatCalendarDateParam(parsed)).toBe("2026-01-02");
    expect(parseCalendarDateParam("not-a-date").getTime()).toBe(
      parseCalendarDateParam(undefined).getTime(),
    );
  });
});
