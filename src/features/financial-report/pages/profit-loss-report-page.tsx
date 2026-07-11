"use client";

import { Suspense, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { DataTableShell } from "@/components/shared";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  DateRangeFilterBar,
  ExportPlaceholderButton,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { getAccountAmountColumns } from "../tables";
import { useDateRangeParams, useProfitLoss } from "../hooks";

function ProfitLossContent() {
  const { params, dateFrom, dateTo, setDateRange } = useDateRangeParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useProfitLoss(params);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilterBar dateFrom={dateFrom} dateTo={dateTo} onChange={setDateRange} />
        <AppButton
          variant="outline"
          size="sm"
          loading={isFetching && !isLoading}
          onClick={() => void refetch()}
        >
          Refresh
        </AppButton>
        <ExportPlaceholderButton />
      </div>

      {isLoading && !data ? (
        <LoadingState label="Loading profit & loss..." />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Revenue" value={formatCurrency(data.totalRevenue)} />
            <MetricCard label="Expenses" value={formatCurrency(data.totalExpenses)} />
            <MetricCard label="Net profit" value={formatCurrency(data.netProfit)} />
          </div>

          <AmountBarChart
            title="Account amounts"
            description="Backend account-level revenue and expense amounts"
            data={chartData}
            isLoading={isLoading}
          />

          <SectionCard title="Revenue accounts">
            <DataTableShell
              columns={revenueColumns}
              data={data.revenue}
              getRowId={(row) => row.accountId}
              emptyState={
                <EmptyState title="No revenue lines" description="No revenue accounts for this period." />
              }
            />
          </SectionCard>

          <SectionCard title="Expense accounts">
            <DataTableShell
              columns={expenseColumns}
              data={data.expenses}
              getRowId={(row) => row.accountId}
              emptyState={
                <EmptyState title="No expense lines" description="No expense accounts for this period." />
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
        description="Backend-generated revenue, expenses, and net profit."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Profit & Loss" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading profit & loss..." />}>
        <ProfitLossContent />
      </Suspense>
    </PageContainer>
  );
}
