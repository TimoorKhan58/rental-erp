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
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  ExportPlaceholderButton,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getCustomerReportColumns } from "../tables";
import { toPaginationMeta } from "../mappers";
import { useCustomerReport, useCustomerReportParams } from "../hooks";

function CustomerReportContent() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setCustomerFilter,
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

  const columns = getCustomerReportColumns();

  const chartData = useMemo(
    () =>
      (data?.lines ?? []).slice(0, 12).map((line) => ({
        label: line.customerCode,
        value: line.revenue,
      })),
    [data],
  );

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
    <div className="space-y-6">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Total customers" value={String(data.totalCustomers)} />
          <MetricCard label="Total revenue" value={formatCurrency(data.totalRevenue)} />
        </div>
      ) : null}

      <AmountBarChart
        title="Customer revenue"
        description="Backend revenue by customer"
        data={chartData}
        isLoading={isLoading}
      />

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.customerId}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search customers..."
            className="w-full sm:max-w-xs"
            aria-label="Search customer report"
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
            title="No customer data"
            description="Customer analytics will appear when rental activity exists."
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
        description="Backend customer revenue, orders, and outstanding balances."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Customers" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading customer report..." />}>
        <CustomerReportContent />
      </Suspense>
    </PageContainer>
  );
}
