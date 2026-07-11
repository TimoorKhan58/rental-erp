"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TrialBalanceParams } from "../types";

export function useTrialBalanceParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<TrialBalanceParams>(() => ({
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  }), [searchParams]);

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
    setDateRange: (from?: string, to?: string) => updateParams({ dateFrom: from, dateTo: to }),
    refreshKey: searchParams.toString(),
  };
}
