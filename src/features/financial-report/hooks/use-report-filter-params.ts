"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRangeParams } from "../types";

export function useDateRangeParams(defaults?: DateRangeParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<DateRangeParams>(
    () => ({
      dateFrom: searchParams.get("dateFrom") ?? defaults?.dateFrom,
      dateTo: searchParams.get("dateTo") ?? defaults?.dateTo,
    }),
    [searchParams, defaults?.dateFrom, defaults?.dateTo],
  );

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        next.delete(key);
        return;
      }

      next.set(key, value);
    });

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return {
    params,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dateFrom: from, dateTo: to }),
  };
}

export function useBalanceSheetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const asOfDate = searchParams.get("asOfDate") ?? undefined;

  const setAsOfDate = (value?: string) => {
    const next = new URLSearchParams(searchParams.toString());

    if (!value) {
      next.delete("asOfDate");
    } else {
      next.set("asOfDate", value);
    }

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return { params: { asOfDate }, asOfDate, setAsOfDate };
}
