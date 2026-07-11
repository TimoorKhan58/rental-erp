"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { GeneralLedgerParams, LedgerSortField } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useGeneralLedgerParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<GeneralLedgerParams | null>(() => {
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return null;
    }

    return {
      accountId,
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as LedgerSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as GeneralLedgerParams["sortOrder"]) ?? "asc",
      search: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    };
  }, [searchParams]);

  const accountId = searchParams.get("accountId") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  const updateParams = (updates: Record<string, string | number | boolean | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
        return;
      }

      next.set(key, String(value));
    });

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return {
    params,
    accountId,
    dateFrom,
    dateTo,
    setAccountId: (id: string | undefined) => updateParams({ accountId: id, page: DEFAULT_PAGE }),
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => updateParams({ search, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dateFrom: from, dateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: LedgerSortField,
      sortOrder: GeneralLedgerParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
