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
    <PageContainer className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Record, approve, and pay operational expenses."
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
