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
import { useDateRangeParams, useExpenseReport } from "../hooks";

function ExpenseContent() {
  const { params, dateFrom, dateTo, setDateRange } = useDateRangeParams();
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
        <LoadingState label="Loading expense report..." />
      ) : data ? (
        <>
          <MetricCard label="Total expenses" value={formatCurrency(data.totalExpenses)} />
          <AmountBarChart
            title="Expenses by account"
            description="Backend expense summary lines"
            data={chartData}
            isLoading={isLoading}
          />
          <SectionCard title="Expense lines">
            <DataTableShell
              columns={columns}
              data={data.lines}
              getRowId={(row) => row.accountId}
              emptyState={
                <EmptyState title="No expense lines" description="No expenses for this period." />
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
        description="Backend-generated expenses by account."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Expenses" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading expense report..." />}>
        <ExpenseContent />
      </Suspense>
    </PageContainer>
  );
}
