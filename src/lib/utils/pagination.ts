import type { PaginationMeta, PaginationParams } from "@/types/api";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function normalizePaginationParams(
  params: PaginationParams = {},
): Required<Pick<PaginationParams, "page" | "pageSize">> &
  Omit<PaginationParams, "page" | "pageSize"> {
  const page = Math.max(DEFAULT_PAGE, params.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  return {
    ...params,
    page,
    pageSize,
  };
}

export function getPageCount(meta: PaginationMeta): number {
  return meta.totalPages;
}

export function getPageRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): Array<number | "ellipsis"> {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = 1; offset <= siblingCount; offset += 1) {
    pages.add(currentPage - offset);
    pages.add(currentPage + offset);
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const range: Array<number | "ellipsis"> = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];

    if (previous !== undefined && page - previous > 1) {
      range.push("ellipsis");
    }

    range.push(page);
  }

  return range;
}

export function getPaginationLabel(meta: PaginationMeta): string {
  if (meta.total === 0) {
    return "No results";
  }

  const start = (meta.page - 1) * meta.pageSize + 1;
  const end = Math.min(meta.page * meta.pageSize, meta.total);

  return `${start}–${end} of ${meta.total}`;
}
