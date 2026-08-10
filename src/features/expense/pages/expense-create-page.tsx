"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { useCreateExpense } from "../hooks";
import { ExpenseForm } from "../forms";
import { toCreateExpensePayload } from "../mappers";
import type { CreateExpenseFormValues } from "../schemas";

export function ExpenseCreatePage() {
  const router = useRouter();
  const createMutation = useCreateExpense();

  const handleSubmit = async (values: CreateExpenseFormValues) => {
    const expense = await createMutation.mutateAsync(toCreateExpensePayload(values));
    router.push(ROUTES.expenseDetail(expense.id));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Record expense"
        description="Create a new operational expense."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Expenses", href: ROUTES.expenses },
          { label: "Record expense" },
        ]}
      />

      <ExpenseForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.expenses)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
