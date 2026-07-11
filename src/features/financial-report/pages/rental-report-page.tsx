"use client";

import { Suspense, useEffect, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/design-system/card";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import { getCustomers } from "@/features/customer/services";
import { getWarehouses } from "@/features/warehouse/services";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  ExportPlaceholderButton,
  ReportsSubNav,
} from "../components";
import { AmountBarChart, StatusPieChart } from "../charts";
import { getRentalReportColumns } from "../tables";
import { toPaginationMeta } from "../mappers";
import { useRentalReport, useRentalReportParams } from "../hooks";

function RentalReportContent() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setCustomerFilter,
    setWarehouseFilter,
    setStatusFilter,
  } = useRentalReportParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useRentalReport(params);

  const customers = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getCustomers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

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

  const columns = getRentalReportColumns();

  const statusChartData = useMemo(
    () =>
      (data?.statusCounts ?? []).map((item) => ({
        label: item.status,
        value: item.count,
      })),
    [data],
  );

  const revenueChartData = useMemo(
    () =>
      (data?.lines ?? []).slice(0, 12).map((line) => ({
        label: line.orderNumber,
        value: line.grandTotal,
      })),
    [data],
  );

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load rental report</p>
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
          <MetricCard label="Total orders" value={String(data.totalOrders)} />
          <MetricCard label="Total revenue" value={formatCurrency(data.totalRevenue)} />
          <MetricCard
            label="Average duration"
            value={`${data.averageDuration.toFixed(1)} days`}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusPieChart
          title="Status mix"
          description="Backend status counts"
          data={statusChartData}
          isLoading={isLoading}
        />
        <AmountBarChart
          title="Order totals"
          description="Backend grand totals for listed orders"
          data={revenueChartData}
          isLoading={isLoading}
        />
      </div>

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search rentals..."
            className="w-full sm:max-w-xs"
            aria-label="Search rental report"
          />
        }
        filters={
          <>
            <Input
              type="date"
              value={params.dateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, params.dateTo)
              }
              className="w-full sm:w-40"
              aria-label="Date from"
            />
            <Input
              type="date"
              value={params.dateTo ?? ""}
              onChange={(event) =>
                setDateRange(params.dateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Date to"
            />
            <Select
              value={params.customerId ?? "all"}
              onValueChange={(value) =>
                setCustomerFilter(!value || value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by customer">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {(customers.data?.items ?? []).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.customerCode} — {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              value={params.status ?? "all"}
              onValueChange={(value) =>
                setStatusFilter(!value || value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(data?.statusCounts ?? []).map((item) => (
                  <SelectItem key={item.status} value={item.status}>
                    {item.status}
                  </SelectItem>
                ))}
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
            title="No rental data"
            description="Rental performance lines will appear when orders exist."
          />
        }
        loadingState={<LoadingState label="Loading rental report..." />}
        pagination={
          data ? (
            <DataPagination meta={toPaginationMeta(data)} onPageChange={setPage} />
          ) : null
        }
      />
    </div>
  );
}

export function RentalReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Rental Performance"
        description="Backend rental KPIs, status mix, and order totals."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Rentals" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading rental report..." />}>
        <RentalReportContent />
      </Suspense>
    </PageContainer>
  );
}
