"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { formatCurrency } from "@/lib/utils";
import { useApproveExpense } from "../hooks";
import type { ExpenseResponse } from "../types";

type ApproveExpenseDialogProps = {
  expense: ExpenseResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApproveExpenseDialog({
  expense,
  open,
  onOpenChange,
}: ApproveExpenseDialogProps) {
  const approveMutation = useApproveExpense();

  if (!expense) {
    return null;
  }

  const handleConfirm = async () => {
    await approveMutation.mutateAsync(expense.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Approve expense"
      description={`Approve "${expense.expenseNumber}" for ${formatCurrency(expense.amount)}?`}
      confirmLabel="Approve"
      onConfirm={() => void handleConfirm()}
      isLoading={approveMutation.isPending}
    />
  );
}
