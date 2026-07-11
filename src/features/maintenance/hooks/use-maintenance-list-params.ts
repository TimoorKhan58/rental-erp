"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ListMaintenancesParams,
  MaintenanceServiceType,
  MaintenanceSortField,
  MaintenanceStatus,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useMaintenanceListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListMaintenancesParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as MaintenanceSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListMaintenancesParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as MaintenanceStatus | null) ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
      inventoryId: searchParams.get("inventoryId") ?? undefined,
    };
  }, [searchParams]);

  const scheduledDateFrom = searchParams.get("scheduledDateFrom") ?? undefined;
  const scheduledDateTo = searchParams.get("scheduledDateTo") ?? undefined;
  const technician = searchParams.get("technician") ?? undefined;
  const serviceType =
    (searchParams.get("serviceType") as MaintenanceServiceType | null) ?? undefined;

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
    scheduledDateFrom,
    scheduledDateTo,
    technician,
    serviceType,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setProductFilter: (productId: string | undefined) =>
      updateParams({ productId, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId: string | undefined) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setStatusFilter: (status: MaintenanceStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setServiceTypeFilter: (value: MaintenanceServiceType | undefined) =>
      updateParams({ serviceType: value, page: DEFAULT_PAGE }),
    setTechnicianFilter: (value: string | undefined) =>
      updateParams({ technician: value, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ scheduledDateFrom: from, scheduledDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: MaintenanceSortField,
      sortOrder: ListMaintenancesParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
