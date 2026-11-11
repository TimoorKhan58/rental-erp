"use client";

import { Suspense, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { ActiveFilters, DataTableShell } from "@/components/shared";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  DateRangeFilterBar,
  ExportReportButton,
  ReportPermissionGate,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getAccountAmountColumns } from "../tables";
import {
  compactActiveFilters,
  dateRangeFilterChip,
  REVENUE_SUMMARY_CSV_COLUMNS,
} from "../mappers";
import { useDateRangeParams, useRevenueReport } from "../hooks";

function RevenueContent() {
  const { params, dateFrom, dateTo, setDateRange, clearDateRange } = useDateRangeParams();
  const activeFilters = compactActiveFilters([
    dateRangeFilterChip(dateFrom, dateTo, "Journal date", clearDateRange),
  ]);
  const { data, isLoading, isError, error, refetch, isFetching } = useRevenueReport(params);
  const columns = getAccountAmountColumns("Revenue");

  const chartData = useMemo(
    () =>
      (data?.lines ?? []).map((line) => ({
        label: line.accountCode,
        value: line.amount,
      })),
    [data],
  );

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load revenue report</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilterBar
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={setDateRange}
          fieldHint="Posted journal date"
        />
        <AppButton
          variant="outline"
          size="sm"
          loading={isFetching && !isLoading}
          onClick={() => void refetch()}
        >
          Refresh
        </AppButton>
        <ExportReportButton
          filename="revenue-report.csv"
          rows={data?.lines ?? []}
          columns={REVENUE_SUMMARY_CSV_COLUMNS}
          csvLabel="CSV"
          disabled={isLoading || !(data?.lines?.length)}
        />
      </div>
      <ActiveFilters filters={activeFilters} onClearAll={clearDateRange} />

      {isLoading && !data ? (
        <LoadingState label="Loading revenue report..." />
      ) : data ? (
        <>
          <MetricCard
            label="Posted journal revenue"
            value={formatCurrency(data.totalRevenue)}
            hint="Posted INCOME accounts"
          />
          <AmountBarChart
            title="Revenue by account"
            description="Posted journal income accounts"
            data={chartData}
            isLoading={isLoading}
          />
          <SectionCard title="Revenue lines">
            <DataTableShell
              columns={columns}
              data={data.lines}
              getRowId={(row) => row.accountId}
              emptyState={
                <EmptyState title="No revenue lines" description="No revenue for this period." />
              }
            />
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

export function RevenueReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Revenue Report"
        description="Posted journal income accounts for the selected journal dates."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Revenue" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireFinancial>
        <Suspense fallback={<LoadingState label="Loading revenue report..." />}>
          <RevenueContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
