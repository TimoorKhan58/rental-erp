import { describe, expect, it } from "vitest";

import { calendarDayToIso, isoToCalendarDay, localDateInputValue } from "./local-date";

describe("localDateInputValue (SaaS phase 4a)", () => {
  it("formats the local calendar date with zero padding", () => {
    expect(localDateInputValue(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
    expect(localDateInputValue(new Date(2026, 10, 18, 23, 30))).toBe("2026-11-18");
  });
});

describe("calendar day picked in a date picker (usability revamp R3)", () => {
  it("saves the clicked day itself, whatever the time zone", () => {
    expect(calendarDayToIso(new Date(2026, 10, 20))).toBe("2026-11-20T00:00:00.000Z");
    expect(calendarDayToIso(new Date(2026, 10, 20, 23, 59))).toBe("2026-11-20T00:00:00.000Z");
  });

  it("shows a saved date as the same calendar day", () => {
    const shown = isoToCalendarDay("2026-11-20T00:00:00.000Z");
    expect([shown.getFullYear(), shown.getMonth(), shown.getDate()]).toEqual([2026, 10, 20]);
  });

  it("leaves values with a time of day alone", () => {
    expect(isoToCalendarDay("2026-11-19T19:00:00.000Z").toISOString()).toBe("2026-11-19T19:00:00.000Z");
  });
});
