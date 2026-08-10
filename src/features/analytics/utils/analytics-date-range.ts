/**
 * Client-visible defaults aligned with backend resolveReportPeriod:
 * dateFrom = UTC start of month, dateTo = UTC "today" (calendar date).
 * Does not change server semantics — makes the same default explicit in the UI.
 */

export function toUtcDateInputValue(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultAnalyticsDateRange(
  reference: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  const dateFrom = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
  );
  return {
    dateFrom: toUtcDateInputValue(dateFrom),
    dateTo: toUtcDateInputValue(reference),
  };
}

/** Client guard only — server Zod DateRangeRefine remains authoritative. */
export function isValidAnalyticsDateRange(
  dateFrom?: string,
  dateTo?: string,
): boolean {
  if (!dateFrom || !dateTo) {
    return true;
  }
  return dateFrom <= dateTo;
}
