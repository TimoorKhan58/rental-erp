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
  buildProfitLossCsvRows,
  compactActiveFilters,
  dateRangeFilterChip,
  PROFIT_LOSS_CSV_COLUMNS,
} from "../mappers";
import { describeChange, previousPeriod } from "../mappers/report-compare.mapper";
import { useDateRangeParams, useProfitLoss } from "../hooks";

function ProfitLossContent() {
  const { params, dateFrom, dateTo, setDateRange, clearDateRange } = useDateRangeParams();
  const activeFilters = compactActiveFilters([
    dateRangeFilterChip(dateFrom, dateTo, "Journal date", clearDateRange),
  ]);
  const { data, isLoading, isError, error, refetch, isFetching } = useProfitLoss(params);
  // With both dates chosen, also load the same-length period just before it.
  const earlier = previousPeriod(dateFrom, dateTo);
  const { data: before } = useProfitLoss(earlier ?? {}, { enabled: earlier !== null });
  const incomeChange = data && before ? describeChange(data.totalRevenue, before.totalRevenue) : null;
  const costChange = data && before ? describeChange(data.totalExpenses, before.totalExpenses, false) : null;
  const profitChange = data && before ? describeChange(data.netProfit, before.netProfit) : null;

  const revenueColumns = getAccountAmountColumns("Revenue");
  const expenseColumns = getAccountAmountColumns("Expense");

  const chartData = useMemo(
    () => [
      ...(data?.revenue ?? []).map((line) => ({
        label: line.accountCode,
        value: line.amount,
      })),
      ...(data?.expenses ?? []).map((line) => ({
        label: line.accountCode,
        value: line.amount,
      })),
    ],
    [data],
  );

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load profit & loss</p>
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
          fieldHint="Counted by the date of each entry"
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
          filename="profit-loss-report.csv"
          rows={data ? buildProfitLossCsvRows(data) : []}
          columns={PROFIT_LOSS_CSV_COLUMNS}
          csvLabel="CSV"
          disabled={isLoading || !data || (data.revenue.length === 0 && data.expenses.length === 0)}
        />
      </div>
      <ActiveFilters filters={activeFilters} onClearAll={clearDateRange} />

      {isLoading && !data ? (
        <LoadingState label="Loading profit & loss..." />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Income"
              value={formatCurrency(data.totalRevenue)}
              change={incomeChange}
              hint="Rent you have invoiced"
            />
            <MetricCard
              label="Costs"
              value={formatCurrency(data.totalExpenses)}
              change={costChange}
              hint="Expenses, hire-ins, repairs and upkeep"
            />
            <MetricCard
              label="Profit"
              value={formatCurrency(data.netProfit)}
              change={profitChange}
              hint="Income minus costs"
            />
          </div>

          <AmountBarChart
            title="Income and costs"
            description="For the dates you chose"
            data={chartData}
            isLoading={isLoading}
          />

          <SectionCard title="Where income came from">
            <DataTableShell
              columns={revenueColumns}
              data={data.revenue}
              getRowId={(row) => row.accountId}
              emptyState={
                <EmptyState title="No income yet" description="No income in this period." />
              }
            />
          </SectionCard>

          <SectionCard title="Where money went">
            <DataTableShell
              columns={expenseColumns}
              data={data.expenses}
              getRowId={(row) => row.accountId}
              emptyState={
                <EmptyState title="No costs yet" description="No costs in this period." />
              }
            />
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

export function ProfitLossReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Profit & Loss"
        description="Income minus costs for the chosen dates, from your accounts."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Profit & Loss" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireFinancial>
        <Suspense fallback={<LoadingState label="Loading profit & loss..." />}>
          <ProfitLossContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
