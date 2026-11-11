"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useExpense, useUpdateExpense } from "../hooks";
import { ExpenseForm } from "../forms";
import {
  canEditExpense,
  toExpenseFormValues,
  toUpdateExpensePayload,
} from "../mappers";
import type { UpdateExpenseFormValues } from "../schemas";

type ExpenseEditPageProps = {
  expenseId: string;
};

export function ExpenseEditPage({ expenseId }: ExpenseEditPageProps) {
  const router = useRouter();
  const { data: expense, isLoading, isError, error, refetch } = useExpense(expenseId);
  const updateMutation = useUpdateExpense();

  useEffect(() => {
    if (expense && !canEditExpense(expense.status)) {
      router.replace(ROUTES.expenseDetail(expenseId));
    }
  }, [expense, expenseId, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading expense..." />
      </PageContainer>
    );
  }

  if (isError || !expense) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Expense not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested expense could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.expenses} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateExpenseFormValues) => {
    await updateMutation.mutateAsync({
      id: expenseId,
      payload: toUpdateExpensePayload(values),
    });
    router.push(ROUTES.expenseDetail(expenseId));
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${expense.expenseNumber}`}
        description="Update expense details while in draft status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Expenses", href: ROUTES.expenses },
          { label: expense.expenseNumber, href: ROUTES.expenseDetail(expenseId) },
          { label: "Edit" },
        ]}
      />

      <ExpenseForm
        mode="edit"
        expenseNumber={expense.expenseNumber}
        defaultValues={toExpenseFormValues(expense)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.expenseDetail(expenseId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
