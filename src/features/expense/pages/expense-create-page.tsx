"use client";

import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import {
  useApproveExpense,
  useCreateExpense,
  usePayExpense,
  useSubmitExpense,
} from "../hooks";
import { ExpenseForm } from "../forms";
import { toCreateExpensePayload } from "../mappers";
import type { CreateExpenseFormValues } from "../schemas";

export function ExpenseCreatePage() {
  const router = useRouter();
  const createMutation = useCreateExpense();
  const submitMutation = useSubmitExpense();
  const approveMutation = useApproveExpense();
  const payMutation = usePayExpense();

  const handleSubmit = async (values: CreateExpenseFormValues) => {
    const expense = await createMutation.mutateAsync(toCreateExpensePayload(values));
    router.push(ROUTES.expenseDetail(expense.id));
  };

  // Owner shortcut: runs the four steps one after another. If one fails the
  // expense stays at the step it reached, and its page shows the next button.
  const handleSubmitAndPay = async (values: CreateExpenseFormValues) => {
    const expense = await createMutation.mutateAsync(toCreateExpensePayload(values));
    try {
      await submitMutation.mutateAsync(expense.id);
      await approveMutation.mutateAsync(expense.id);
      await payMutation.mutateAsync(expense.id);
    } finally {
      router.push(ROUTES.expenseDetail(expense.id));
    }
  };

  const busy =
    createMutation.isPending ||
    submitMutation.isPending ||
    approveMutation.isPending ||
    payMutation.isPending;

  return (
    <PageContainer>
      <PageHeader
        title="Add an expense"
        description="What was it for, how much, and paid from where."
        breadcrumbs={[
          { label: "Expenses", href: ROUTES.expenses },
          { label: "Add an expense" },
        ]}
      />

      <ExpenseForm
        mode="create"
        onSubmit={handleSubmit}
        onSubmitAndPay={handleSubmitAndPay}
        onCancel={() => router.push(ROUTES.expenses)}
        isSubmitting={busy}
      />
    </PageContainer>
  );
}
