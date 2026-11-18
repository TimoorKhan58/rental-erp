import { formatNumber } from "./number";

/**
 * "1 item", "3 items", "1,250 items" (usability revamp R1). Pass the plural
 * form when it is not just "+s" ("1 delivery", "2 deliveries").
 */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** The word alone, for sentences that place the number themselves. */
export function pluralWord(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
