"use client";

import { Suspense, useEffect, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/design-system/card";
import { ActiveFilters, DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  ExportReportButton,
  ReportPermissionGate,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getProductReportColumns } from "../tables";
import { withReportSorting } from "../tables/report-sortable-columns";
import { compactActiveFilters, dateRangeFilterChip, toPaginationMeta } from "../mappers";
import { useProductReport, useProductReportParams } from "../hooks";
import type { ProductReportSortField } from "../types";

function ProductReportContent() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setSorting,
    clearAllFilters,
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

  const columns = withReportSorting(
    getProductReportColumns(),
    {
      productCode: "productCode",
      rentalCount: "rentalCount",
      quantityDays: "quantityDays",
      revenue: "revenue",
    },
    params,
    (field, order) => setSorting(field as ProductReportSortField, order ?? "asc"),
  );

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

  const pageRevenue = (data?.lines ?? []).reduce((sum, line) => sum + line.revenue, 0);
  const pageQuantityDays = (data?.lines ?? []).reduce(
    (sum, line) => sum + line.quantityDays,
    0,
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
  ]);
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="space-y-5">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Products (filtered)"
            value={String(data.total)}
            hint="Full matching set"
          />
          <MetricCard
            label="Booked total (this page)"
            value={formatCurrency(pageRevenue)}
            hint="Current page line totals — not the full filtered set"
          />
          <MetricCard
            label="Quantity-days (this page)"
            value={String(pageQuantityDays)}
            hint="Current page only"
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <AmountBarChart
          title="Product booked totals (this page)"
          description="Line totals for the current page only"
          data={revenueChartData}
          isLoading={isLoading}
        />
        <AmountBarChart
          title="Most rented (quantity-days)"
          description="Highest rental volume in the filtered set"
          data={mostRentedChartData}
          isLoading={isLoading}
        />
      </div>

      <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.productId}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search product code or name..."
            className="w-full sm:max-w-xs"
            aria-label="Search product report"
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
              <p className="text-xs text-muted-foreground">Filters on rental booking date</p>
            </div>
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
                { header: "Booked total", value: (row) => row.revenue },
                { header: "On hand", value: (row) => row.quantityOnHand },
              ]}
              disabled={isLoading || !(data?.lines?.length)}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={hasActiveFilters ? "No matching rows" : "No product data"}
            description={
              hasActiveFilters
                ? "No products match the current search or filters."
                : "Product analytics will appear when rental activity exists."
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
        description="Product rental volume and booked line totals by booking date. Summary cards for money and quantity-days are this page only."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Products" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireOperational>
        <Suspense fallback={<LoadingState label="Loading product report..." />}>
          <ProductReportContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
