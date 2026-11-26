"use client";

import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { ActiveFilters } from "@/components/shared";
import { MetricCard, SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import {
  DateRangeFilterBar,
  ExportReportButton,
  ReportPermissionGate,
  ReportsSubNav,
} from "../components";
import { buildBalanceSheetCsvRows, BALANCE_SHEET_CSV_COLUMNS } from "../mappers";
import { useBalanceSheet, useBalanceSheetParams } from "../hooks";

function BalanceSheetContent() {
  const { params, asOfDate, setAsOfDate, clearAsOfDate } = useBalanceSheetParams();
  const activeFilters = asOfDate
    ? [
        {
          id: "asOfDate",
          label: `As of: ${asOfDate}`,
          onClear: clearAsOfDate,
        },
      ]
    : [];
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilterBar
          mode="asOf"
          asOfDate={asOfDate}
          onAsOfDateChange={setAsOfDate}
          onChange={() => undefined}
          fieldHint="Shows the position on this day"
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
          filename="balance-sheet-report.csv"
          rows={data ? buildBalanceSheetCsvRows(data) : []}
          columns={BALANCE_SHEET_CSV_COLUMNS}
          csvLabel="CSV"
          disabled={isLoading || !data}
        />
      </div>
      <ActiveFilters filters={activeFilters} onClearAll={clearAsOfDate} />

      {isLoading && !data ? (
        <LoadingState label="Loading balance sheet..." />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="What you own"
              value={formatCurrency(data.totalAssets)}
              hint="Cash, bank, equipment and money owed to you"
            />
            <MetricCard
              label="What you owe"
              value={formatCurrency(data.totalLiabilities)}
              hint="Mostly suppliers"
            />
            <MetricCard
              label="Your share"
              value={formatCurrency(data.totalEquity)}
              hint="What you put in (opening balance)"
            />
            <MetricCard
              label="Profit so far"
              value={formatCurrency(data.netIncome)}
              hint="Income minus costs"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {(
              [
                ["What you own", data.assets],
                ["What you owe", data.liabilities],
                ["Your share", data.equity],
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
            {data.isBalanced
              ? "The books balance: what you own equals what you owe plus your share."
              : "The books do not balance. Ask your accountant to check the entries."}
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
        description="What the business owns and owes on the chosen date."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: "Balance Sheet" },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireFinancial>
        <Suspense fallback={<LoadingState label="Loading balance sheet..." />}>
          <BalanceSheetContent />
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}
