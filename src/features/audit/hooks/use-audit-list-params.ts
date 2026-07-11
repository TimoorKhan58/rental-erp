"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseAuditListFilters } from "../schemas";
import type { AuditAction, AuditSortField, ListAuditLogsParams } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useAuditListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListAuditLogsParams>(() => {
    const filters = parseAuditListFilters({
      search: searchParams.get("search") ?? undefined,
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      action: (searchParams.get("action") as AuditAction | null) ?? undefined,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
    });

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as AuditSortField | null) ?? "createdAt",
      sortOrder:
        (searchParams.get("sortOrder") as ListAuditLogsParams["sortOrder"]) ?? "desc",
      ...filters,
    };
  }, [searchParams]);

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  const updateParams = (updates: Record<string, string | number | undefined>) => {
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
      const filters = parseAuditListFilters({ search });
      updateParams({ search: filters.search, page: DEFAULT_PAGE });
    },
    setEntityTypeFilter: (entityType?: string) => {
      const filters = parseAuditListFilters({ entityType });
      updateParams({ entityType: filters.entityType, page: DEFAULT_PAGE });
    },
    setEntityIdFilter: (entityId?: string) => {
      const filters = parseAuditListFilters({ entityId });
      updateParams({ entityId: filters.entityId, page: DEFAULT_PAGE });
    },
    setUserIdFilter: (userId?: string) => {
      const filters = parseAuditListFilters({ userId });
      updateParams({ userId: filters.userId, page: DEFAULT_PAGE });
    },
    setActionFilter: (action?: AuditAction) => {
      const filters = parseAuditListFilters({ action });
      updateParams({ action: filters.action, page: DEFAULT_PAGE });
    },
    setDateRange: (from?: string, to?: string) => {
      const filters = parseAuditListFilters({ fromDate: from, toDate: to });
      updateParams({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        page: DEFAULT_PAGE,
      });
    },
    setSorting: (
      sortBy: AuditSortField,
      sortOrder: ListAuditLogsParams["sortOrder"] = "desc",
    ) => updateParams({ sortBy, sortOrder }),
  };
}
