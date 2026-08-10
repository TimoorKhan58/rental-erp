"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AssetSortField, AssetStatus, ListAssetsParams } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useAssetListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListAssetsParams>(() => {
    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as AssetSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListAssetsParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (searchParams.get("status") as AssetStatus | null) ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
    };
  }, [searchParams]);

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  const updateParams = (
    updates: Record<string, string | number | boolean | undefined>,
  ) => {
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
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setStatusFilter: (status: AssetStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setCategoryFilter: (categoryId: string | undefined) =>
      updateParams({ categoryId, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId: string | undefined) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: AssetSortField,
      sortOrder: ListAssetsParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
  };
}
