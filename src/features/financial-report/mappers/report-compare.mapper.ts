/**
 * "vs the time before" for reports (UI redesign). For a chosen date range
 * the earlier period is the same number of days, ending the day before.
 */

const DAY_MS = 86_400_000;

function parseDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The same-length period just before dateFrom..dateTo (inclusive days). Null when either date is missing or invalid. */
export function previousPeriod(
  dateFrom: string | undefined,
  dateTo: string | undefined,
): { dateFrom: string; dateTo: string } | null {
  if (!dateFrom || !dateTo) return null;
  const from = parseDay(dateFrom);
  const to = parseDay(dateTo);
  if (from === null || to === null || to < from) return null;
  const days = Math.round((to - from) / DAY_MS) + 1;
  return { dateFrom: formatDay(from - days * DAY_MS), dateTo: formatDay(from - DAY_MS) };
}

export type ChangeTone = "good" | "bad" | "neutral";

export type ChangeLabel = { text: string; tone: ChangeTone };

/**
 * "Up 18% on the time before". `higherIsBetter` is false for costs, where
 * going up is bad news. Returns null when there is nothing to compare to.
 */
export function describeChange(
  now: number,
  before: number,
  higherIsBetter = true,
): ChangeLabel | null {
  if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
  if (before === 0) {
    return now === 0 ? null : { text: "New: nothing in the time before", tone: "neutral" };
  }
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  if (pct === 0) return { text: "Same as the time before", tone: "neutral" };
  const up = pct > 0;
  return {
    text: `${up ? "Up" : "Down"} ${Math.abs(pct)}% on the time before`,
    tone: up === higherIsBetter ? "good" : "bad",
  };
}
