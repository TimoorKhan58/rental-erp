"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  normalizePaginationParams,
} from "@/lib/utils";
import type { PaginationParams } from "@/types/api";

export function usePagination(initial?: PaginationParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pagination = useMemo(
    () =>
      normalizePaginationParams({
        page: Number(searchParams.get("page") ?? initial?.page ?? DEFAULT_PAGE),
        pageSize: Number(
          searchParams.get("pageSize") ?? initial?.pageSize ?? DEFAULT_PAGE_SIZE,
        ),
        sortBy: searchParams.get("sortBy") ?? initial?.sortBy,
        sortOrder:
          (searchParams.get("sortOrder") as PaginationParams["sortOrder"]) ??
          initial?.sortOrder,
        search: searchParams.get("search") ?? initial?.search,
      }),
    [initial, searchParams],
  );

  const [localSearch, setLocalSearch] = useState(pagination.search ?? "");

  const updateParams = useCallback(
    (updates: Partial<PaginationParams>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
          return;
        }

        params.set(key, String(value));
      });

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (page: number) => updateParams({ page }),
    [updateParams],
  );

  const setPageSize = useCallback(
    (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    [updateParams],
  );

  const setSearch = useCallback(
    (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    [updateParams],
  );

  const setSorting = useCallback(
    (sortBy: string, sortOrder: PaginationParams["sortOrder"] = "asc") => {
      updateParams({ sortBy, sortOrder });
    },
    [updateParams],
  );

  return {
    ...pagination,
    localSearch,
    setPage,
    setPageSize,
    setSearch,
    setSorting,
    updateParams,
  };
}
