"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductSortField, ListProductsParams } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useProductListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListProductsParams>(() => {
    const isActiveParam = searchParams.get("isActive");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as ProductSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListProductsParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      isActive:
        isActiveParam === null
          ? undefined
          : isActiveParam === "true",
    };
  }, [searchParams]);

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  const updateParams = (updates: Partial<ListProductsParams>) => {
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
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setStatusFilter: (isActive: boolean | undefined) =>
      updateParams({ isActive, page: DEFAULT_PAGE }),
    setSorting: (sortBy: ProductSortField, sortOrder: ListProductsParams["sortOrder"] = "asc") =>
      updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
