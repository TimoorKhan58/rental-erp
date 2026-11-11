"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RentalOrderStatus } from "../types";
import {
  formatCalendarDateParam,
  parseCalendarDateParam,
  shiftAnchor,
  type CalendarViewMode,
} from "../utils/reservation-calendar.utils";

function parseView(value: string | null): CalendarViewMode {
  return value === "month" ? "month" : "week";
}

export function useReservationCalendarParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = parseView(searchParams.get("view"));
  const anchor = useMemo(
    () => parseCalendarDateParam(searchParams.get("date") ?? undefined),
    [searchParams],
  );
  const status = (searchParams.get("status") as RentalOrderStatus | null) ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;
  const warehouseId = searchParams.get("warehouseId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const [localSearch, setLocalSearch] = useState(search ?? "");

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

  const clearAllFilters = () => {
    setLocalSearch("");
    updateParams({
      search: undefined,
      status: undefined,
      customerId: undefined,
      warehouseId: undefined,
    });
  };

  return {
    view,
    anchor,
    status,
    customerId,
    warehouseId,
    search,
    localSearch,
    setLocalSearch,
    setView: (nextView: CalendarViewMode) => updateParams({ view: nextView }),
    setAnchor: (nextAnchor: Date) =>
      updateParams({ date: formatCalendarDateParam(nextAnchor) }),
    shiftPeriod: (direction: -1 | 1) =>
      updateParams({
        date: formatCalendarDateParam(shiftAnchor(anchor, view, direction)),
      }),
    goToToday: () => updateParams({ date: formatCalendarDateParam(new Date()) }),
    setSearch: (value: string) => {
      setLocalSearch(value);
      updateParams({ search: value || undefined });
    },
    setStatus: (value: RentalOrderStatus | undefined) =>
      updateParams({ status: value }),
    setCustomerId: (value: string | undefined) =>
      updateParams({ customerId: value }),
    setWarehouseId: (value: string | undefined) =>
      updateParams({ warehouseId: value }),
    clearAllFilters,
  };
}
