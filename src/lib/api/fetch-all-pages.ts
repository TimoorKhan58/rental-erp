import type { PaginatedResult } from "@/shared/domain/pagination";

/** The API returns at most this many rows per page. */
const PAGE_SIZE = 100;
/** Safety stop: 50 pages = 5,000 rows. */
const MAX_PAGES = 50;

/**
 * Loads every page of a list, for drop-downs of master data (customers,
 * items, warehouses, suppliers…). Pickers used to load only the first 100,
 * so in a company with 1,000 customers 900 could not be chosen on an order
 * (QA huge-data run).
 */
export async function fetchAllPages<T, P extends { page?: number; pageSize?: number }>(
  fetchPage: (params: P) => Promise<PaginatedResult<T>>,
  params: Omit<P, "page" | "pageSize">,
): Promise<PaginatedResult<T>> {
  const first = await fetchPage({ ...params, page: 1, pageSize: PAGE_SIZE } as P);
  const totalPages = Math.min(first.meta.totalPages, MAX_PAGES);
  if (totalPages <= 1) {
    return first;
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchPage({ ...params, page: index + 2, pageSize: PAGE_SIZE } as P),
    ),
  );
  const items = [first, ...rest].flatMap((page) => page.items);

  return {
    items,
    meta: { page: 1, pageSize: items.length, total: first.meta.total, totalPages: 1 },
  };
}

/**
 * Every row in any of the given statuses, for pickers of open work (orders to
 * send out, invoices to collect…). Open work is a small part of all records,
 * so this stays quick even with years of history, and nothing old but still
 * open is cut off after the newest 100 (QA X5).
 */
export async function fetchAllWithStatuses<
  T,
  S extends string,
  P extends { page?: number; pageSize?: number; status?: S },
>(
  fetchPage: (params: P) => Promise<PaginatedResult<T>>,
  statuses: readonly S[],
  params: Omit<P, "page" | "pageSize" | "status"> = {} as Omit<P, "page" | "pageSize" | "status">,
): Promise<PaginatedResult<T>> {
  const results = await Promise.all(
    statuses.map((status) =>
      fetchAllPages(fetchPage, { ...params, status } as unknown as Omit<P, "page" | "pageSize">),
    ),
  );
  const items = results.flatMap((result) => result.items);
  return {
    items,
    meta: { page: 1, pageSize: items.length, total: items.length, totalPages: 1 },
  } as PaginatedResult<T>;
}
