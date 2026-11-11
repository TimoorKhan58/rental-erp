"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { formatCurrency } from "@/lib/utils";
import { usePayExpense } from "../hooks";
import type { ExpenseResponse } from "../types";

type PayExpenseDialogProps = {
  expense: ExpenseResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PayExpenseDialog({
  expense,
  open,
  onOpenChange,
}: PayExpenseDialogProps) {
  const payMutation = usePayExpense();

  if (!expense) {
    return null;
  }

  const handleConfirm = async () => {
    await payMutation.mutateAsync(expense.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Mark expense as paid"
      description={`Mark "${expense.expenseNumber}" for ${formatCurrency(expense.amount)} as paid? This is the financially authoritative step. When expense and cash accounts are configured, a journal is posted in the same transaction (debit expense, credit cash). If those accounts are missing, the expense still becomes Paid without a journal. This does not create a supplier payment, payment record, or inventory movement. Server rules remain authoritative.`}
      confirmLabel="Mark paid"
      onConfirm={() => void handleConfirm()}
      isLoading={payMutation.isPending}
    />
  );
}
