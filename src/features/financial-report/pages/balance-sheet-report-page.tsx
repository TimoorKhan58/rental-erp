"use client";

import { Suspense } from "react";
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
import { useBalanceSheet, useBalanceSheetParams } from "../hooks";

function BalanceSheetContent() {
  const { params, asOfDate, setAsOfDate } = useBalanceSheetParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useBalanceSheet(params);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load balance sheet</p>
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
        <DateRangeFilterBar
          mode="asOf"
          asOfDate={asOfDate}
          onAsOfDateChange={setAsOfDate}
          onChange={() => undefined}
        />
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
        <LoadingState label="Loading balance sheet..." />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total assets" value={formatCurrency(data.totalAssets)} />
            <MetricCard
              label="Total liabilities"
              value={formatCurrency(data.totalLiabilities)}
            />
            <MetricCard label="Total equity" value={formatCurrency(data.totalEquity)} />
            <MetricCard label="Net income" value={formatCurrency(data.netIncome)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {(
              [
                ["Assets", data.assets],
                ["Liabilities", data.liabilities],
                ["Equity", data.equity],
              ] as const
            ).map(([title, section]) => (
              <SectionCard key={title} title={title}>
                <ul className="space-y-2 text-sm">
                  {section.accounts.map((account) => (
                    <li
                      key={account.accountId}
                      className="flex items-center justify-between gap-2 border-b border-border/60 py-2 last:border-b-0"
                    >
                      <span>
                        {account.accountCode} — {account.accountName}
                      </span>
                      <span className="font-medium">{formatCurrency(account.balance)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm font-semibold">
                  Total: {formatCurrency(section.total)}
                </p>
              </SectionCard>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Balanced: {data.isBalanced ? "Yes" : "No"}
          </p>
        </>
      ) : null}
    </div>
  );
}

export function BalanceSheetReportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Balance Sheet"
        description="Backend-generated assets, liabilities, and equity."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Balance Sheet" },
        ]}
      />
      <ReportsSubNav />
      <Suspense fallback={<LoadingState label="Loading balance sheet..." />}>
        <BalanceSheetContent />
      </Suspense>
    </PageContainer>
  );
}
