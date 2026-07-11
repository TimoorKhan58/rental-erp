"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { InventorySortField, ListInventoryParams, StockStatusFilter } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useInventoryListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListInventoryParams>(() => {
    const isActiveParam = searchParams.get("isActive");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as InventorySortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListInventoryParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
      isActive:
        isActiveParam === null
          ? undefined
          : isActiveParam === "true",
    };
  }, [searchParams]);

  const stockStatus =
    (searchParams.get("stockStatus") as StockStatusFilter | "all" | null) ?? "all";

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
    stockStatus,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setProductFilter: (productId: string | undefined) =>
      updateParams({ productId, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId: string | undefined) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setStatusFilter: (isActive: boolean | undefined) =>
      updateParams({ isActive, page: DEFAULT_PAGE }),
    setStockStatusFilter: (value: StockStatusFilter | "all") =>
      updateParams({ stockStatus: value === "all" ? undefined : value, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: InventorySortField,
      sortOrder: ListInventoryParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
