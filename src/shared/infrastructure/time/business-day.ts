/**
 * Calendar days in a business's own time zone (SaaS phase 4a).
 *
 * RentCore stores date-only values (rental start/end, return and invoice
 * dates) as midnight UTC of that calendar day. A "business day" therefore
 * uses the same form: midnight UTC of the date it is *in the business's
 * time zone*. Comparing it with stored dates needs no other change.
 *
 * Example: 18 Nov 2026 01:00 in Karachi is 17 Nov 20:00 UTC. In UTC it is
 * still the 17th; for a Karachi business it is the 18th.
 */

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date (year, month 1-12, day) of `instant` in `timeZone`. */
export function calendarDateIn(timeZone: string, instant: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** Today in `timeZone`, as midnight UTC of that calendar date. */
export function businessDay(timeZone: string, instant: Date = new Date()): Date {
  const { year, month, day } = calendarDateIn(timeZone, instant);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "YYYY-MM-DD" of `instant` in `timeZone` (for forms and file names). */
export function businessDateString(timeZone: string, instant: Date = new Date()): string {
  return businessDay(timeZone, instant).toISOString().slice(0, 10);
}
