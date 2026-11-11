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
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  ExportReportButton,
  ReportPermissionGate,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getCustomerReportColumns } from "../tables";
import { withReportSorting } from "../tables/report-sortable-columns";
import {
  compactActiveFilters,
  CUSTOMER_REPORT_CSV_COLUMNS,
  dateRangeFilterChip,
  toPaginationMeta,
} from "../mappers";
import { useCustomerReport, useCustomerReportParams } from "../hooks";
import type { CustomerReportSortField } from "../types";

function CustomerReportContent() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setCustomerFilter,
    setSorting,
    clearAllFilters,
  } = useCustomerReportParams();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCustomerReport(params);

  const customers = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getCustomers({ pageSize: 100, isActive: true }),
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
    getCustomerReportColumns(),
    {
      customerCode: "customerCode",
      orderCount: "orderCount",
      revenue: "revenue",
    },
    params,
    (field, order) => setSorting(field as CustomerReportSortField, order ?? "asc"),
  );

  const chartData = useMemo(
    () =>
      (data?.lines ?? []).slice(0, 12).map((line) => ({
        label: line.customerCode,
        value: line.revenue,
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
  ]);
  const hasActiveFilters = activeFilters.length > 0;

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load customer report</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="Customers"
            value={String(data.totalCustomers)}
            hint="Active customers matching the current filters"
          />
          <MetricCard
            label="Booked order total"
            value={formatCurrency(data.totalRevenue)}
            hint="Order grand totals by booking date — not collected cash"
          />
        </div>
      ) : null}

      <AmountBarChart
        title="Customer booked totals (this page)"
        description="Order grand totals for the current page only"
        data={chartData}
        isLoading={isLoading}
      />

      <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.customerId}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search customer code or name..."
            className="w-full sm:max-w-xs"
            aria-label="Search customer report"
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
              <p className="text-xs text-muted-foreground">
                Booking date applies to order totals. Open invoice balance is not date-filtered.
              </p>
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
              filename="customer-report.csv"
              rows={data?.lines ?? []}
              columns={CUSTOMER_REPORT_CSV_COLUMNS}
              disabled={isLoading || !(data?.lines?.length)}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={hasActiveFilters ? "No matching rows" : "No customer data"}
            description={
              hasActiveFilters
                ? "No customers match the current search or filters."
                : "Customer analytics will appear when rental activity exists."
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
        loadingState={<LoadingState label="Loading customer report..." />}
        pagination={
          data ? (
            <DataPagination meta={toPaginationMeta(data)} onPageChange={setPage} />
          ) : null
        }
      />
    </div>
  );
}

export function CustomerReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Customer Report"
        description="Booked order totals by booking date. Outstanding invoice balances are current open amounts, not period-filtered."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Customers" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireOperational>
        <Suspense fallback={<LoadingState label="Loading customer report..." />}>
          <CustomerReportContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
