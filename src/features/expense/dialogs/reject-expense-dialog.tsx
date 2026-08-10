"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { TextAreaField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { formatCurrency } from "@/lib/utils";
import {
  rejectExpenseFormSchema,
  type RejectExpenseFormValues,
} from "../schemas";
import { useRejectExpense } from "../hooks";
import type { ExpenseResponse } from "../types";

type RejectExpenseDialogProps = {
  expense: ExpenseResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RejectExpenseDialog({
  expense,
  open,
  onOpenChange,
}: RejectExpenseDialogProps) {
  const rejectMutation = useRejectExpense();
  const form = useForm<RejectExpenseFormValues>({
    resolver: zodResolver(rejectExpenseFormSchema),
    defaultValues: { rejectionReason: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ rejectionReason: "" });
    }
  }, [open, form]);

  if (!expense) {
    return null;
  }

  const handleSubmit = async (values: RejectExpenseFormValues) => {
    await rejectMutation.mutateAsync({
      id: expense.id,
      rejectionReason: values.rejectionReason.trim(),
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reject expense"
      description={`Reject "${expense.expenseNumber}" for ${formatCurrency(expense.amount)}. Provide a reason.`}
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextAreaField
          control={form.control}
          name="rejectionReason"
          label="Rejection reason"
          placeholder="Explain why this expense is being rejected"
        />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            variant="destructive"
            loading={rejectMutation.isPending}
          >
            Reject expense
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
