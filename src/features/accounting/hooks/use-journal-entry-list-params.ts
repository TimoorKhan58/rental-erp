"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  JournalEntrySortField,
  JournalEntryStatus,
  JournalReferenceType,
  ListJournalEntriesParams,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useJournalEntryListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListJournalEntriesParams>(() => {
    const statusParam = searchParams.get("status");
    const referenceTypeParam = searchParams.get("referenceType");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as JournalEntrySortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListJournalEntriesParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as JournalEntryStatus | null) ?? undefined,
      referenceType: (referenceTypeParam as JournalReferenceType | null) ?? undefined,
      journalDateFrom: searchParams.get("journalDateFrom") ?? undefined,
      journalDateTo: searchParams.get("journalDateTo") ?? undefined,
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
    setStatusFilter: (status: JournalEntryStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setReferenceTypeFilter: (referenceType: JournalReferenceType | undefined) =>
      updateParams({ referenceType, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ journalDateFrom: from, journalDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: JournalEntrySortField,
      sortOrder: ListJournalEntriesParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
