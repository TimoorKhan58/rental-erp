import type { FilterInput, FilterResult } from "./types";

function isMeaningfulFilterValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return false;
  }

  return true;
}

export function buildFilter(input: FilterInput): FilterResult {
  const result: FilterResult = {};

  for (const [key, value] of Object.entries(input)) {
    if (isMeaningfulFilterValue(value)) {
      result[key] = value;
    }
  }

  return result;
}
