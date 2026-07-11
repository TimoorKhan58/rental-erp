"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ListReturnsParams, ReturnSortField, ReturnStatus } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useReturnListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListReturnsParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as ReturnSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListReturnsParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as ReturnStatus | null) ?? undefined,
      rentalOrderId: searchParams.get("rentalOrderId") ?? undefined,
      dispatchId: searchParams.get("dispatchId") ?? undefined,
    };
  }, [searchParams]);

  const returnDateFrom = searchParams.get("returnDateFrom") ?? undefined;
  const returnDateTo = searchParams.get("returnDateTo") ?? undefined;

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

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
    returnDateFrom,
    returnDateTo,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setRentalOrderFilter: (rentalOrderId: string | undefined) =>
      updateParams({ rentalOrderId, page: DEFAULT_PAGE }),
    setDispatchFilter: (dispatchId: string | undefined) =>
      updateParams({ dispatchId, page: DEFAULT_PAGE }),
    setStatusFilter: (status: ReturnStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ returnDateFrom: from, returnDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: ReturnSortField,
      sortOrder: ListReturnsParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
