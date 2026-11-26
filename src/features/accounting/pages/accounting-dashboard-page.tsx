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

  const { balanceSheet, profitLoss } = data;
  // Cash and bank: the asset accounts numbered 10xx (1000 Cash, 1010 Cash in hand, 1020 Bank...).
  const cashAccounts = balanceSheet.assets.accounts.filter((account) => account.accountCode.startsWith("10"));
  const cashAndBank = cashAccounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Accounting"
        description="Your books: what you have, what you owe and what you earned."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting" },
        ]}
      />

      <AccountingSubNav />

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Cash and bank"
          value={formatCurrency(cashAndBank)}
          hint={
            cashAndBank < 0
              ? "Minus: enter your opening balance so this starts from the right amount"
              : "Money you hold now, in hand and at the bank"
          }
        />
        <MetricCard label="What you own" value={formatCurrency(balanceSheet.totalAssets)} hint="Cash, equipment and money owed to you" />
        <MetricCard label="What you owe" value={formatCurrency(balanceSheet.totalLiabilities)} hint="Mostly suppliers" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Income" value={formatCurrency(profitLoss.totalRevenue)} hint="Rent you have invoiced" />
        <MetricCard label="Costs" value={formatCurrency(profitLoss.totalExpenses)} hint="Expenses, hire-ins, repairs and upkeep" />
        <MetricCard label="Profit" value={formatCurrency(profitLoss.netProfit)} hint="Income minus costs" />
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        {balanceSheet.isBalanced
          ? "The books balance: what you own equals what you owe plus your share."
          : "The books do not balance. Ask your accountant to check the entries."}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Reports about your money">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={ROUTES.reportsProfitLoss} className="text-primary hover:underline">
                Profit &amp; Loss
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsCashFlow} className="text-primary hover:underline">
                Cash Flow
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reportsBalanceSheet} className="text-primary hover:underline">
                Balance Sheet
              </Link>
            </li>
            <li>
              <Link href={ROUTES.reports} className="text-primary hover:underline">
                All reports
              </Link>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="What goes into the books by itself">
          <p className="text-sm text-muted-foreground">
            RentCore writes the book entries for you when you issue an invoice, receive a payment,
            pay an expense, receive a purchase, pay a supplier, hire items in, finish a repair or buy
            equipment. Missing standard accounts are added automatically. Enter your opening
            balance once, so cash and bank start from the right amount.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={ROUTES.accountingOpeningBalance} className="text-primary hover:underline">
                Opening balance (money you started with)
              </Link>
            </li>
            <li>
              <Link href={ROUTES.accountingJournalEntries} className="text-primary hover:underline">
                See every entry
              </Link>
            </li>
          </ul>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
