"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { UserRole } from "@/constants/roles";
import type { ListUsersParams, UserSortField } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useUserListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListUsersParams>(() => {
    const isActiveParam = searchParams.get("isActive");
    const roleParam = searchParams.get("role");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as UserSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListUsersParams["sortOrder"]) ??
        "desc",
      search: searchParams.get("search") ?? undefined,
      isActive:
        isActiveParam === null ? undefined : isActiveParam === "true",
      role: (roleParam as UserRole | null) ?? undefined,
    };
  }, [searchParams]);

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  const updateParams = (updates: Partial<ListUsersParams>) => {
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
    setPageSize: (pageSize: number) =>
      updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setStatusFilter: (isActive: boolean | undefined) =>
      updateParams({ isActive, page: DEFAULT_PAGE }),
    setRoleFilter: (role: UserRole | undefined) =>
      updateParams({ role, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: UserSortField,
      sortOrder: ListUsersParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
