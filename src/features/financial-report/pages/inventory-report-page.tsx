"use client";

import { Suspense, useEffect, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/design-system/card";
import { DataTableShell, DataPagination } from "@/components/shared";
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
  ExportPlaceholderButton,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getInventoryReportColumns } from "../tables";
import { toPaginationMeta } from "../mappers";
import { useInventoryReport, useInventoryReportParams } from "../hooks";

function InventoryReportContent() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setWarehouseFilter,
    setLowStockOnly,
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

  const columns = getInventoryReportColumns();

  const chartData = useMemo(
    () =>
      (data?.lines ?? []).slice(0, 12).map((line) => ({
        label: line.productCode,
        value: line.inventoryValue,
      })),
    [data],
  );

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
    <div className="space-y-6">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Total quantity" value={String(data.totalQuantity)} />
          <MetricCard label="Available" value={String(data.totalAvailable)} />
          <MetricCard label="Total value" value={formatCurrency(data.totalValue)} />
          <MetricCard label="Reserved" value={String(data.totalReserved)} />
          <MetricCard label="Low stock" value={String(data.lowStockCount)} />
          <MetricCard label="Overstock" value={String(data.overstockCount)} />
        </div>
      ) : null}

      <AmountBarChart
        title="Inventory value by product"
        description="Backend inventory values for listed lines"
        data={chartData}
        isLoading={isLoading}
      />

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.inventoryId}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search inventory..."
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
                  : params.lowStockOnly === false
                    ? "all"
                    : "all"
              }
              onValueChange={(value) =>
                setLowStockOnly(value === "low" ? true : undefined)
              }
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter low stock">
                <SelectValue placeholder="Stock filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock</SelectItem>
                <SelectItem value="low">Low stock only</SelectItem>
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
            <ExportPlaceholderButton />
          </>
        }
        emptyState={
          <EmptyState
            title="No inventory data"
            description="Inventory report lines will appear when stock exists."
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
        description="Backend inventory quantities, values, and stock flags."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Inventory" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading inventory report..." />}>
        <InventoryReportContent />
      </Suspense>
    </PageContainer>
  );
}
