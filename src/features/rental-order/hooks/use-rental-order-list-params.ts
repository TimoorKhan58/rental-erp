"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ListRentalOrdersParams,
  RentalOrderSortField,
  RentalOrderStatus,
  RentalReservationFilter,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useRentalOrderListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListRentalOrdersParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as RentalOrderSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListRentalOrdersParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as RentalOrderStatus | null) ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
    };
  }, [searchParams]);

  const reservationStatus =
    (searchParams.get("reservationStatus") as RentalReservationFilter | "all" | null) ?? "all";
  const startDateFrom = searchParams.get("startDateFrom") ?? undefined;
  const startDateTo = searchParams.get("startDateTo") ?? undefined;

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
    reservationStatus,
    startDateFrom,
    startDateTo,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setCustomerFilter: (customerId: string | undefined) =>
      updateParams({ customerId, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId: string | undefined) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setStatusFilter: (status: RentalOrderStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setReservationFilter: (value: RentalReservationFilter | "all") =>
      updateParams({
        reservationStatus: value === "all" ? undefined : value,
        page: DEFAULT_PAGE,
      }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ startDateFrom: from, startDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: RentalOrderSortField,
      sortOrder: ListRentalOrdersParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
