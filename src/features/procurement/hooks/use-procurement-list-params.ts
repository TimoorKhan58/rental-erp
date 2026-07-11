"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ListProcurementsParams,
  ProcurementSortField,
  PurchaseOrderStatus,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useProcurementListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListProcurementsParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as ProcurementSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListProcurementsParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as PurchaseOrderStatus | null) ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
    };
  }, [searchParams]);

  const orderDateFrom = searchParams.get("orderDateFrom") ?? undefined;
  const orderDateTo = searchParams.get("orderDateTo") ?? undefined;

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
    orderDateFrom,
    orderDateTo,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setSupplierFilter: (supplierId: string | undefined) =>
      updateParams({ supplierId, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId: string | undefined) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setStatusFilter: (status: PurchaseOrderStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ orderDateFrom: from, orderDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: ProcurementSortField,
      sortOrder: ListProcurementsParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
