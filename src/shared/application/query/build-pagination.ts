import type { PaginationInput, PaginationResult } from "./types";

export function buildPagination(input: PaginationInput): PaginationResult {
  const { page, pageSize } = input;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
