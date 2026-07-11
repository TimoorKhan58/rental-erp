"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ListRepairsParams, RepairSortField, RepairStatus } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useRepairListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListRepairsParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as RepairSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListRepairsParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as RepairStatus | null) ?? undefined,
      returnId: searchParams.get("returnId") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
    };
  }, [searchParams]);

  const repairDateFrom = searchParams.get("repairDateFrom") ?? undefined;
  const repairDateTo = searchParams.get("repairDateTo") ?? undefined;
  const technician = searchParams.get("technician") ?? undefined;

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
    repairDateFrom,
    repairDateTo,
    technician,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setReturnFilter: (returnId: string | undefined) =>
      updateParams({ returnId, page: DEFAULT_PAGE }),
    setProductFilter: (productId: string | undefined) =>
      updateParams({ productId, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId: string | undefined) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setStatusFilter: (status: RepairStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setTechnicianFilter: (value: string | undefined) =>
      updateParams({ technician: value, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ repairDateFrom: from, repairDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: RepairSortField,
      sortOrder: ListRepairsParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
