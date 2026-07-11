"use client";

import { Suspense, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  DateRangeFilterBar,
  ExportPlaceholderButton,
  ReportsSubNav,
} from "../components";
import { AmountBarChart } from "../charts";
import { useCashFlow, useDateRangeParams } from "../hooks";

function CashFlowContent() {
  const { params, dateFrom, dateTo, setDateRange } = useDateRangeParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useCashFlow(params);

  const chartData = useMemo(
    () =>
      data
        ? [
            { label: "Net income", value: data.netIncome },
            { label: "Adjustments", value: data.adjustments },
            { label: "Operations", value: data.cashFromOperations },
            { label: "Receipts", value: data.cashReceipts },
            { label: "Payments", value: data.cashPayments },
            { label: "Net change", value: data.netCashChange },
          ]
        : [],
    [data],
  );

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load cash flow</p>
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
        <LoadingState label="Loading cash flow..." />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Cash from operations" value={formatCurrency(data.cashFromOperations)} />
            <MetricCard label="Cash receipts" value={formatCurrency(data.cashReceipts)} />
            <MetricCard label="Cash payments" value={formatCurrency(data.cashPayments)} />
            <MetricCard label="Net income" value={formatCurrency(data.netIncome)} />
            <MetricCard label="Adjustments" value={formatCurrency(data.adjustments)} />
            <MetricCard label="Net cash change" value={formatCurrency(data.netCashChange)} />
          </div>

          <AmountBarChart
            title="Cash flow summary"
            description="Backend cash flow components"
            data={chartData}
            isLoading={isLoading}
          />

          <SectionCard title="Notes">
            <p className="text-sm text-muted-foreground">
              Values are provided by the cash-flow summary API. Investing and financing
              breakdowns are not exposed as separate sections in the current backend response.
            </p>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

export function CashFlowReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Cash Flow"
        description="Backend-generated cash flow summary."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Cash Flow" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading cash flow..." />}>
        <CashFlowContent />
      </Suspense>
    </PageContainer>
  );
}
