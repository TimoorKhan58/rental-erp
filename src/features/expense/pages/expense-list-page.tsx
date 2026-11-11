"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { ExpenseSummaryCards } from "../components";
import { useExpensePermissions, useExpenseSummaryStats } from "../hooks";
import { ExpenseListTable } from "../tables";

export function ExpenseListPage() {
  const { canCreate } = useExpensePermissions();
  const { stats, statusCounts, isLoading } = useExpenseSummaryStats();

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Expenses"
        description="Record a draft, submit for approval, then mark paid. A journal is posted only when marked paid, and only if expense and cash accounts are configured. Paying does not create a supplier payment or change inventory."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Expenses" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.expensesNew} />}
            >
              Record expense
            </AppButton>
          ) : undefined
        }
      />

      <ExpenseSummaryCards stats={stats} isLoading={isLoading} />

      <ExpenseListTable statusCounts={statusCounts} />
    </PageContainer>
  );
}
