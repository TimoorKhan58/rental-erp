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
        description="Money the business spends: fuel, wages, rent, repairs."
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.expensesNew} />}
            >
              Add an expense
            </AppButton>
          ) : undefined
        }
      />

      <ExpenseSummaryCards stats={stats} isLoading={isLoading} />

      <ExpenseListTable statusCounts={statusCounts} />
    </PageContainer>
  );
}
