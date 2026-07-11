"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  DispatchSortField,
  DispatchStatus,
  ListDispatchesParams,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useDispatchListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListDispatchesParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as DispatchSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListDispatchesParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as DispatchStatus | null) ?? undefined,
      rentalOrderId: searchParams.get("rentalOrderId") ?? undefined,
    };
  }, [searchParams]);

  const warehouseId = searchParams.get("warehouseId") ?? undefined;
  const dispatchDateFrom = searchParams.get("dispatchDateFrom") ?? undefined;
  const dispatchDateTo = searchParams.get("dispatchDateTo") ?? undefined;

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
    warehouseId,
    dispatchDateFrom,
    dispatchDateTo,
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
    setWarehouseFilter: (value: string | undefined) =>
      updateParams({ warehouseId: value, page: DEFAULT_PAGE }),
    setStatusFilter: (status: DispatchStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dispatchDateFrom: from, dispatchDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: DispatchSortField,
      sortOrder: ListDispatchesParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
