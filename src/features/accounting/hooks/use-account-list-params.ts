"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AccountSortField, AccountType, ListAccountsParams } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useAccountListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListAccountsParams>(() => {
    const accountTypeParam = searchParams.get("accountType");
    const isActiveParam = searchParams.get("isActive");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as AccountSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListAccountsParams["sortOrder"]) ?? "asc",
      search: searchParams.get("search") ?? undefined,
      accountType: (accountTypeParam as AccountType | null) ?? undefined,
      isActive:
        isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined,
    };
  }, [searchParams]);

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
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setAccountTypeFilter: (accountType: AccountType | undefined) =>
      updateParams({ accountType, page: DEFAULT_PAGE }),
    setActiveFilter: (isActive: boolean | undefined) =>
      updateParams({
        isActive: isActive === undefined ? undefined : isActive,
        page: DEFAULT_PAGE,
      }),
    setSorting: (
      sortBy: AccountSortField,
      sortOrder: ListAccountsParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
