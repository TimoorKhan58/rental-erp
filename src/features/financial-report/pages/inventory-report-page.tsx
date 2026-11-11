"use client";

import { Suspense, useEffect, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/design-system/card";
import { ActiveFilters, DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import { getWarehouses } from "@/features/warehouse/services";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  ExportReportButton,
  ReportPermissionGate,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getInventoryReportColumns } from "../tables";
import { withReportSorting } from "../tables/report-sortable-columns";
import { compactActiveFilters, toPaginationMeta } from "../mappers";
import { useInventoryReport, useInventoryReportParams } from "../hooks";
import type { InventoryReportSortField } from "../types";

function InventoryReportContent() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setWarehouseFilter,
    setLowStockOnly,
    setOverstockOnly,
    setSorting,
    clearAllFilters,
  } = useInventoryReportParams();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useInventoryReport(params);

  const warehouses = useQuery({
    queryKey: queryKeys.warehouses.list({ pageSize: 100, isActive: true }),
    queryFn: () => getWarehouses({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const columns = withReportSorting(
    getInventoryReportColumns(),
    {
      productCode: "productCode",
      warehouseCode: "warehouseCode",
      quantityOnHand: "quantityOnHand",
      availableQuantity: "availableQuantity",
      inventoryValue: "inventoryValue",
    },
    params,
    (field, order) => setSorting(field as InventoryReportSortField, order ?? "asc"),
  );

  const chartData = useMemo(
    () =>
      (data?.lines ?? []).slice(0, 12).map((line) => ({
        label: line.productCode,
        value: line.inventoryValue,
      })),
    [data],
  );

  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    params.warehouseId
      ? {
          id: "warehouse",
          label: "Warehouse",
          onClear: () => setWarehouseFilter(undefined),
        }
      : null,
    params.lowStockOnly
      ? {
          id: "lowStock",
          label: "Low stock only",
          onClear: () => setLowStockOnly(undefined),
        }
      : null,
    params.overstockOnly
      ? {
          id: "overstock",
          label: "Overstock only",
          onClear: () => setOverstockOnly(undefined),
        }
      : null,
  ]);
  const hasActiveFilters = activeFilters.length > 0;

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load inventory report</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="On hand"
            value={String(data.totalQuantity)}
            hint="Filtered snapshot totals"
          />
          <MetricCard
            label="Available"
            value={String(data.totalAvailable)}
            hint="On hand minus reserved"
          />
          <MetricCard
            label="Inventory value"
            value={formatCurrency(data.totalValue)}
            hint="Filtered snapshot"
          />
          <MetricCard label="Reserved" value={String(data.totalReserved)} />
          <MetricCard label="Low stock" value={String(data.lowStockCount)} />
          <MetricCard label="Overstock" value={String(data.overstockCount)} />
        </div>
      ) : null}

      <AmountBarChart
        title="Inventory value (this page)"
        description="Values for the current page only"
        data={chartData}
        isLoading={isLoading}
      />

      <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.inventoryId}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search product code, name, or warehouse code..."
            className="w-full sm:max-w-xs"
            aria-label="Search inventory report"
          />
        }
        filters={
          <>
            <Select
              value={params.warehouseId ?? "all"}
              onValueChange={(value) =>
                setWarehouseFilter(!value || value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by warehouse">
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {(warehouses.data?.items ?? []).map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouseCode} — {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={
                params.lowStockOnly === true
                  ? "low"
                  : params.overstockOnly === true
                    ? "over"
                    : "all"
              }
              onValueChange={(value) => {
                if (value === "low") {
                  setLowStockOnly(true);
                  return;
                }

                if (value === "over") {
                  setOverstockOnly(true);
                  return;
                }

                setLowStockOnly(undefined);
                setOverstockOnly(undefined);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter stock flags">
                <SelectValue placeholder="Stock filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock</SelectItem>
                <SelectItem value="low">Low stock only</SelectItem>
                <SelectItem value="over">Overstock only</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <>
            <AppButton
              variant="outline"
              size="sm"
              loading={isFetching && !isLoading}
              onClick={() => void refetch()}
            >
              Refresh
            </AppButton>
            <ExportReportButton
              filename="inventory-report.csv"
              rows={data?.lines ?? []}
              columns={[
                { header: "Product code", value: (row) => row.productCode },
                { header: "Product name", value: (row) => row.productName },
                { header: "Warehouse", value: (row) => row.warehouseCode },
                { header: "On hand", value: (row) => row.quantityOnHand },
                { header: "Available", value: (row) => row.availableQuantity },
                { header: "Value", value: (row) => row.inventoryValue },
                {
                  header: "Flag",
                  value: (row) =>
                    row.isLowStock ? "Low stock" : row.isOverstock ? "Overstock" : "",
                },
              ]}
              disabled={isLoading || !(data?.lines?.length)}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={hasActiveFilters ? "No matching rows" : "No inventory data"}
            description={
              hasActiveFilters
                ? "No inventory lines match the current search or filters."
                : "Inventory report lines will appear when stock exists."
            }
            action={
              hasActiveFilters ? (
                <AppButton variant="outline" onClick={clearAllFilters}>
                  Clear filters
                </AppButton>
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading inventory report..." />}
        pagination={
          data ? (
            <DataPagination meta={toPaginationMeta(data)} onPageChange={setPage} />
          ) : null
        }
      />
    </div>
  );
}

export function InventoryReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Inventory Report"
        description="Current stock snapshot using on-hand, reserved, and available quantities."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Inventory" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireOperational>
        <Suspense fallback={<LoadingState label="Loading inventory report..." />}>
          <InventoryReportContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
