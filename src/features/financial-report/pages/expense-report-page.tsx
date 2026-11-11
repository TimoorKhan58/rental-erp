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
  EXPENSE_SUMMARY_CSV_COLUMNS,
} from "../mappers";
import { useDateRangeParams, useExpenseReport } from "../hooks";

function ExpenseContent() {
  const { params, dateFrom, dateTo, setDateRange, clearDateRange } = useDateRangeParams();
  const activeFilters = compactActiveFilters([
    dateRangeFilterChip(dateFrom, dateTo, "Journal date", clearDateRange),
  ]);
  const { data, isLoading, isError, error, refetch, isFetching } = useExpenseReport(params);
  const columns = getAccountAmountColumns("Expense");

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
        <p className="text-sm font-medium">Failed to load expense report</p>
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
          filename="expense-report.csv"
          rows={data?.lines ?? []}
          columns={EXPENSE_SUMMARY_CSV_COLUMNS}
          csvLabel="CSV"
          disabled={isLoading || !(data?.lines?.length)}
        />
      </div>
      <ActiveFilters filters={activeFilters} onClearAll={clearDateRange} />

      {isLoading && !data ? (
        <LoadingState label="Loading expense report..." />
      ) : data ? (
        <>
          <MetricCard
            label="Posted journal expenses"
            value={formatCurrency(data.totalExpenses)}
            hint="GL expense accounts — not the operational Expenses module"
          />
          <AmountBarChart
            title="Expenses by account"
            description="Posted journal expense accounts"
            data={chartData}
            isLoading={isLoading}
          />
          <SectionCard title="Expense lines">
            <DataTableShell
              columns={columns}
              data={data.lines}
              getRowId={(row) => row.accountId}
              emptyState={
                <EmptyState
                  title="No expense lines"
                  description="No posted journal expense accounts for this period."
                />
              }
            />
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

export function ExpenseReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Expense Report"
        description="Posted journal expense accounts for the selected journal dates. This is not the operational Expenses module."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Expenses" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireFinancial>
        <Suspense fallback={<LoadingState label="Loading expense report..." />}>
          <ExpenseContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
