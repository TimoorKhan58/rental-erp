"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard, SectionCard } from "@/components/design-system/card";
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
        description="Your books: accounts, entries and money reports."
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
            <li>
              <Link href={ROUTES.accountingOpeningBalance} className="text-primary hover:underline">
                Opening balance (money you started with)
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsProfitLoss} className="text-primary hover:underline">
                Profit &amp; loss report
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsBalanceSheet} className="text-primary hover:underline">
                Balance sheet report
              </Link>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Financial reports">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={ROUTES.reportsProfitLoss} className="text-primary hover:underline">
                Profit &amp; loss
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsBalanceSheet} className="text-primary hover:underline">
                Balance sheet
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsCashFlow} className="text-primary hover:underline">
                Cash flow
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsRevenue} className="text-primary hover:underline">
                Revenue summary
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsExpenses} className="text-primary hover:underline">
                Expense summary
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsAnalytics} className="text-primary hover:underline">
                Executive analytics
              </Link>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="What goes into the books by itself">
          <p className="text-sm text-muted-foreground">
            RentCore writes the book entries for you when you issue an invoice, receive a payment,
            pay an expense, receive a purchase, pay a supplier, or hire items in. Missing standard
            accounts are added automatically. Enter your opening balance once, so cash and bank
            start from the right amount.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={ROUTES.rentalInvoices} className="text-primary hover:underline">
                Rental invoices
              </Link>
            </li>
            <li>
              <Link href={ROUTES.payments} className="text-primary hover:underline">
                Payments
              </Link>
            </li>
            <li>
              <Link href={ROUTES.expenses} className="text-primary hover:underline">
                Expenses
              </Link>
            </li>
          </ul>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
