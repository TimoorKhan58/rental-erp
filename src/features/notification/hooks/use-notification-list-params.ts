"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseNotificationListFilters } from "../schemas";
import type {
  ListNotificationsParams,
  NotificationChannel,
  NotificationSortField,
  NotificationStatus,
  ReadFilter,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useNotificationListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListNotificationsParams>(() => {
    const readParam = searchParams.get("read");
    const unreadParam = searchParams.get("unread");

    const filters = parseNotificationListFilters({
      search: searchParams.get("search") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      read:
        readParam === "true" || readParam === "1"
          ? true
          : readParam === "false" || readParam === "0"
            ? false
            : undefined,
      unread:
        unreadParam === "true" || unreadParam === "1"
          ? true
          : unreadParam === "false" || unreadParam === "0"
            ? false
            : undefined,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
      recipientId: searchParams.get("recipientId") ?? undefined,
    });

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy:
        (searchParams.get("sortBy") as NotificationSortField | null) ??
        undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListNotificationsParams["sortOrder"]) ??
        undefined,
      ...filters,
    };
  }, [searchParams]);

  const readFilter: ReadFilter = params.unread
    ? "unread"
    : params.read
      ? "read"
      : "all";

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
    readFilter,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      const filters = parseNotificationListFilters({ search });
      updateParams({ search: filters.search, page: DEFAULT_PAGE });
    },
    setTypeFilter: (type?: NotificationChannel) => {
      const filters = parseNotificationListFilters({ type });
      updateParams({ type: filters.type, page: DEFAULT_PAGE });
    },
    setStatusFilter: (status?: NotificationStatus) => {
      const filters = parseNotificationListFilters({ status });
      updateParams({ status: filters.status, page: DEFAULT_PAGE });
    },
    setReadFilter: (filter: ReadFilter) => {
      if (filter === "unread") {
        updateParams({ unread: true, read: undefined, page: DEFAULT_PAGE });
        return;
      }
      if (filter === "read") {
        updateParams({ read: true, unread: undefined, page: DEFAULT_PAGE });
        return;
      }
      updateParams({ read: undefined, unread: undefined, page: DEFAULT_PAGE });
    },
    setDateRange: (from?: string, to?: string) => {
      const filters = parseNotificationListFilters({ fromDate: from, toDate: to });
      updateParams({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        page: DEFAULT_PAGE,
      });
    },
    setSorting: (
      sortBy: NotificationSortField,
      sortOrder: ListNotificationsParams["sortOrder"] = "desc",
    ) => updateParams({ sortBy, sortOrder }),
  };
}
