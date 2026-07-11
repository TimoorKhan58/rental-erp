"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard, SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import { AccountingSubNav } from "../components";
import { useAccountingSummary } from "../hooks";

export function AccountingDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useAccountingSummary();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading accounting summary..." />
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Failed to load accounting summary</p>
          <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
          <AppButton variant="outline" onClick={() => void refetch()}>
            Try again
          </AppButton>
        </div>
      </PageContainer>
    );
  }

  const { balanceSheet, profitLoss, accountsSummary } = data;

  return (
    <PageContainer>
      <PageHeader
        title="Accounting"
        description="General ledger, chart of accounts, and financial reporting."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting" },
        ]}
      />

      <AccountingSubNav />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total assets" value={formatCurrency(balanceSheet.totalAssets)} />
        <MetricCard label="Total liabilities" value={formatCurrency(balanceSheet.totalLiabilities)} />
        <MetricCard label="Equity" value={formatCurrency(balanceSheet.totalEquity)} />
        <MetricCard label="Revenue" value={formatCurrency(profitLoss.totalRevenue)} />
        <MetricCard label="Expenses" value={formatCurrency(profitLoss.totalExpenses)} />
        <MetricCard label="Net profit" value={formatCurrency(profitLoss.netProfit)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Account summary">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total accounts
              </dt>
              <dd className="text-sm">{accountsSummary.totalAccounts}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active accounts
              </dt>
              <dd className="text-sm">{accountsSummary.activeAccounts}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Inactive accounts
              </dt>
              <dd className="text-sm">{accountsSummary.inactiveAccounts}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Balance sheet balanced
              </dt>
              <dd className="text-sm">{balanceSheet.isBalanced ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Quick links">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={ROUTES.accountingChartOfAccounts} className="text-primary hover:underline">
                Chart of accounts
              </Link>
            </li>
            <li>
              <Link href={ROUTES.accountingJournalEntries} className="text-primary hover:underline">
                Journal entries
              </Link>
            </li>
            <li>
              <Link href={ROUTES.accountingGeneralLedger} className="text-primary hover:underline">
                General ledger
              </Link>
            </li>
            <li>
              <Link href={ROUTES.accountingTrialBalance} className="text-primary hover:underline">
                Trial balance
              </Link>
            </li>
          </ul>
        </SectionCard>

        <EmptyCard
          title="Financial reports"
          description="Dedicated financial report views will be available in a future phase."
        />

        <EmptyCard
          title="Audit timeline"
          description="Audit trail details will appear here when available from the API."
        />
      </div>
    </PageContainer>
  );
}
