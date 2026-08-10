"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { formatCurrency } from "@/lib/utils";
import { useSubmitExpense } from "../hooks";
import type { ExpenseResponse } from "../types";

type SubmitExpenseDialogProps = {
  expense: ExpenseResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SubmitExpenseDialog({
  expense,
  open,
  onOpenChange,
}: SubmitExpenseDialogProps) {
  const submitMutation = useSubmitExpense();

  if (!expense) {
    return null;
  }

  const handleConfirm = async () => {
    await submitMutation.mutateAsync(expense.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Submit expense"
      description={`Submit "${expense.expenseNumber}" for ${formatCurrency(expense.amount)} for approval?`}
      confirmLabel="Submit"
      onConfirm={() => void handleConfirm()}
      isLoading={submitMutation.isPending}
    />
  );
}
