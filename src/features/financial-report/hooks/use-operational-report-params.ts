"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  CustomerReportParams,
  CustomerReportSortField,
  InventoryReportParams,
  InventoryReportSortField,
  OperationalReportListParams,
  ProductReportParams,
  ProductReportSortField,
  RentalReportParams,
  RentalReportSortField,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function useUrlUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  return { searchParams, updateParams };
}

export function useRentalReportParams() {
  const { searchParams, updateParams } = useUrlUpdater();

  const params = useMemo<RentalReportParams>(
    () => ({
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as RentalReportSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as RentalReportParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    }),
    [searchParams],
  );

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  return {
    params,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dateFrom: from, dateTo: to, page: DEFAULT_PAGE }),
    setCustomerFilter: (customerId?: string) =>
      updateParams({ customerId, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId?: string) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setStatusFilter: (status?: string) => updateParams({ status, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: RentalReportSortField,
      sortOrder: RentalReportParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
  };
}

export function useInventoryReportParams() {
  const { searchParams, updateParams } = useUrlUpdater();

  const params = useMemo<InventoryReportParams>(() => {
    const lowStockOnly = searchParams.get("lowStockOnly");
    const overstockOnly = searchParams.get("overstockOnly");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as InventoryReportSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as InventoryReportParams["sortOrder"]) ?? "asc",
      search: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
      lowStockOnly:
        lowStockOnly === "true" ? true : lowStockOnly === "false" ? false : undefined,
      overstockOnly:
        overstockOnly === "true" ? true : overstockOnly === "false" ? false : undefined,
    };
  }, [searchParams]);

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  return {
    params,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dateFrom: from, dateTo: to, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId?: string) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setLowStockOnly: (lowStockOnly?: boolean) =>
      updateParams({
        lowStockOnly: lowStockOnly === undefined ? undefined : lowStockOnly,
        page: DEFAULT_PAGE,
      }),
    setSorting: (
      sortBy: InventoryReportSortField,
      sortOrder: InventoryReportParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
  };
}

export function useCustomerReportParams() {
  const { searchParams, updateParams } = useUrlUpdater();

  const params = useMemo<CustomerReportParams>(
    () => ({
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as CustomerReportSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as CustomerReportParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
    }),
    [searchParams],
  );

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  return {
    params,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dateFrom: from, dateTo: to, page: DEFAULT_PAGE }),
    setCustomerFilter: (customerId?: string) =>
      updateParams({ customerId, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: CustomerReportSortField,
      sortOrder: CustomerReportParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
  };
}

export function useProductReportParams() {
  const { searchParams, updateParams } = useUrlUpdater();

  const params = useMemo<ProductReportParams>(
    () => ({
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as ProductReportSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ProductReportParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    }),
    [searchParams],
  );

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  return {
    params,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dateFrom: from, dateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: ProductReportSortField,
      sortOrder: ProductReportParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
  };
}

export function useOperationalListReportParams(options?: {
  defaultSortOrder?: "asc" | "desc";
}) {
  const { searchParams, updateParams } = useUrlUpdater();
  const defaultSortOrder = options?.defaultSortOrder ?? "desc";

  const params = useMemo<OperationalReportListParams>(
    () => ({
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as OperationalReportListParams["sortOrder"]) ??
        defaultSortOrder,
      search: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      warehouseId: searchParams.get("warehouseId") ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
    }),
    [searchParams, defaultSortOrder],
  );

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  return {
    params,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setDateRange: (from?: string, to?: string) =>
      updateParams({ dateFrom: from, dateTo: to, page: DEFAULT_PAGE }),
    setStatusFilter: (status?: string) => updateParams({ status, page: DEFAULT_PAGE }),
    setWarehouseFilter: (warehouseId?: string) =>
      updateParams({ warehouseId, page: DEFAULT_PAGE }),
    setSupplierFilter: (supplierId?: string) =>
      updateParams({ supplierId, page: DEFAULT_PAGE }),
    setSorting: (sortBy: string, sortOrder: "asc" | "desc" = "asc") =>
      updateParams({ sortBy, sortOrder }),
  };
}
