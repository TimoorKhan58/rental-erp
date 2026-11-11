"use client";

import { Suspense, useEffect, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/design-system/card";
import { ActiveFilters, DataTableShell, DataPagination } from "@/components/shared";
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
  ExportReportButton,
  ReportPermissionGate,
  ReportsSubNav,
} from "../components";
import { AmountBarChart, StatusPieChart } from "../charts";
import { getRentalReportColumns } from "../tables";
import { withReportSorting } from "../tables/report-sortable-columns";
import {
  compactActiveFilters,
  dateRangeFilterChip,
  RENTAL_REPORT_CSV_COLUMNS,
  toPaginationMeta,
} from "../mappers";
import { RENTAL_REPORT_STATUS_OPTIONS } from "../constants/report-filter-options";
import { useRentalReport, useRentalReportParams } from "../hooks";
import type { RentalReportSortField } from "../types";

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
    setSorting,
    clearAllFilters,
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

  const columns = withReportSorting(
    getRentalReportColumns(),
    {
      orderNumber: "orderNumber",
      status: "status",
      bookingDate: "bookingDate",
      grandTotal: "grandTotal",
    },
    params,
    (field, order) => setSorting(field as RentalReportSortField, order ?? "asc"),
  );

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
    dateRangeFilterChip(params.dateFrom, params.dateTo, "Booking date", () =>
      setDateRange(undefined, undefined),
    ),
    params.customerId
      ? {
          id: "customer",
          label: "Customer",
          onClear: () => setCustomerFilter(undefined),
        }
      : null,
    params.warehouseId
      ? {
          id: "warehouse",
          label: "Warehouse",
          onClear: () => setWarehouseFilter(undefined),
        }
      : null,
    params.status
      ? {
          id: "status",
          label: `Status: ${params.status}`,
          onClear: () => setStatusFilter(undefined),
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
        <p className="text-sm font-medium">Failed to load rental report</p>
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
            label="Filtered orders"
            value={String(data.totalOrders)}
            hint="All matching orders, not this page only"
          />
          <MetricCard
            label="Booked order total"
            value={formatCurrency(data.totalRevenue)}
            hint="Sum of order grand totals in the filter — all statuses, not collected cash"
          />
          <MetricCard
            label="Average duration"
            value={`${data.averageDuration.toFixed(1)} days`}
            hint="Event start to event end"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusPieChart
          title="Status mix"
          description="Filtered status counts for the full matching set"
          data={statusChartData}
          isLoading={isLoading}
        />
        <AmountBarChart
          title="Order totals (this page)"
          description="Grand totals for the current page only"
          data={revenueChartData}
          isLoading={isLoading}
        />
      </div>

      <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search order number, customer, warehouse, or status..."
            className="w-full sm:max-w-xs"
            aria-label="Search rental report"
          />
        }
        filters={
          <>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={params.dateFrom ?? ""}
                  onChange={(event) =>
                    setDateRange(event.target.value || undefined, params.dateTo)
                  }
                  className="w-full sm:w-40"
                  aria-label="Date from (booking date)"
                />
                <Input
                  type="date"
                  value={params.dateTo ?? ""}
                  onChange={(event) =>
                    setDateRange(params.dateFrom, event.target.value || undefined)
                  }
                  className="w-full sm:w-40"
                  aria-label="Date to (booking date)"
                />
              </div>
              <p className="text-xs text-muted-foreground">Filters on booking date</p>
            </div>
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
                {RENTAL_REPORT_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
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
            <ExportReportButton
              filename="rental-report.csv"
              rows={data?.lines ?? []}
              columns={RENTAL_REPORT_CSV_COLUMNS}
              disabled={isLoading || !(data?.lines?.length)}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={hasActiveFilters ? "No matching rows" : "No rental data"}
            description={
              hasActiveFilters
                ? "No rental orders match the current search or filters."
                : "Rental performance lines will appear when orders exist."
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
        description="Rental orders by booking date. Booked totals are order grand totals, not collected cash."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Rentals" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireOperational>
        <Suspense fallback={<LoadingState label="Loading rental report..." />}>
          <RentalReportContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
