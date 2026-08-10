"use client";

import { Suspense, useEffect, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/design-system/card";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  ExportReportButton,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getProductReportColumns } from "../tables";
import { toPaginationMeta } from "../mappers";
import { useProductReport, useProductReportParams } from "../hooks";

function ProductReportContent() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
  } = useProductReportParams();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useProductReport(params);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const columns = getProductReportColumns();

  const revenueChartData = useMemo(
    () =>
      (data?.lines ?? []).slice(0, 12).map((line) => ({
        label: line.productCode,
        value: line.revenue,
      })),
    [data],
  );

  const mostRentedChartData = useMemo(
    () =>
      (data?.mostRented ?? []).slice(0, 8).map((line) => ({
        label: line.productCode,
        value: line.quantityDays,
      })),
    [data],
  );

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load product report</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const totalRevenue = (data?.lines ?? []).reduce((sum, line) => sum + line.revenue, 0);
  const totalQuantityDays = (data?.lines ?? []).reduce(
    (sum, line) => sum + line.quantityDays,
    0,
  );

  return (
    <div className="space-y-6">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Products in report" value={String(data.total)} />
          <MetricCard label="Total revenue" value={formatCurrency(totalRevenue)} />
          <MetricCard label="Total quantity-days" value={String(totalQuantityDays)} />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <AmountBarChart
          title="Product revenue"
          description="Revenue by product for the selected period"
          data={revenueChartData}
          isLoading={isLoading}
        />
        <AmountBarChart
          title="Most rented (quantity-days)"
          description="Highest rental volume in the period"
          data={mostRentedChartData}
          isLoading={isLoading}
        />
      </div>

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.productId}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search products..."
            className="w-full sm:max-w-xs"
            aria-label="Search product report"
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
              filename="products-report.csv"
              rows={data?.lines ?? []}
              columns={[
                { header: "Product code", value: (row) => row.productCode },
                { header: "Product name", value: (row) => row.productName },
                { header: "Rate", value: (row) => row.rentalPricePerDay },
                { header: "Rentals", value: (row) => row.rentalCount },
                { header: "Qty rented", value: (row) => row.rentedQuantity },
                { header: "Qty-days", value: (row) => row.quantityDays },
                { header: "Revenue", value: (row) => row.revenue },
                { header: "On hand", value: (row) => row.quantityOnHand },
              ]}
              disabled={isLoading || !(data?.lines?.length)}
            />
          </>
        }
        emptyState={
          <EmptyState
            title="No product data"
            description="Product analytics will appear when rental activity exists."
          />
        }
        loadingState={<LoadingState label="Loading product report..." />}
        pagination={
          data ? (
            <DataPagination meta={toPaginationMeta(data)} onPageChange={setPage} />
          ) : null
        }
      />
    </div>
  );
}

export function ProductReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Product Report"
        description="Rental performance by product — revenue, volume, and catalog rates."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Products" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading product report..." />}>
        <ProductReportContent />
      </Suspense>
    </PageContainer>
  );
}
