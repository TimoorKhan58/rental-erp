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
      description={`Mark "${expense.expenseNumber}" for ${formatCurrency(expense.amount)} as paid? This records the money as spent. If your accounts are set up, it is also added to them.`}
      confirmLabel="Mark paid"
      onConfirm={() => void handleConfirm()}
      isLoading={payMutation.isPending}
    />
  );
}
