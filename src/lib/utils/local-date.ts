/**
 * Today's date in the browser's own time zone as "YYYY-MM-DD" (SaaS phase
 * 4a). `new Date().toISOString().slice(0, 10)` gives the UTC date instead,
 * which in Pakistan is still yesterday until 5 am.
 */
export function localDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The calendar day a person clicked, as UTC midnight (usability revamp R3).
 * Dates like rental start/end are stored date-only, so sending local
 * midnight ("2026-11-19T19:00Z" for 20 Nov in Pakistan) saved the day before.
 */
export function calendarDayToIso(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

/** Reverse of calendarDayToIso, for showing a saved date in a date picker. */
export function isoToCalendarDay(value: string): Date {
  const date = new Date(value);
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  return date;
}
