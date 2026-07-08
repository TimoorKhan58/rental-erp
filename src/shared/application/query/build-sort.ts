import type { SortInput, SortResult } from "./types";

export function buildSort(input: SortInput): SortResult | undefined {
  const { sortBy, sortOrder = "asc" } = input;

  if (sortBy === undefined || sortBy.length === 0) {
    return undefined;
  }

  return {
    [sortBy]: sortOrder,
  };
}
