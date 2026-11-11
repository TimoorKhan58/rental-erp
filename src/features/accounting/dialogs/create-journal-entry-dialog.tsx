"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config/routes";
import {
  createJournalEntryFormSchema,
  type CreateJournalEntryFormValues,
} from "../schemas";
import { useChartOfAccounts, useCreateJournalEntry } from "../hooks";

type CreateJournalEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function buildManualJournalNumber(): string {
  return `JE-MAN-${Date.now()}`;
}

export function CreateJournalEntryDialog({
  open,
  onOpenChange,
}: CreateJournalEntryDialogProps) {
  const router = useRouter();
  const createMutation = useCreateJournalEntry();
  const { data: accountsData } = useChartOfAccounts({ pageSize: 100, isActive: true });

  const accountOptions = useMemo(
    () =>
      (accountsData?.items ?? []).map((account) => ({
        id: account.id,
        label: `${account.accountCode} — ${account.name}`,
      })),
    [accountsData?.items],
  );

  const form = useForm<CreateJournalEntryFormValues>({
    resolver: zodResolver(createJournalEntryFormSchema),
    defaultValues: {
      journalNumber: buildManualJournalNumber(),
      journalDate: new Date().toISOString().slice(0, 10),
      description: "",
      debitAccountId: "",
      creditAccountId: "",
      amount: "",
      memo: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        journalNumber: buildManualJournalNumber(),
        journalDate: new Date().toISOString().slice(0, 10),
        description: "",
        debitAccountId: "",
        creditAccountId: "",
        amount: "",
        memo: "",
      });
    }
  }, [open, form]);

  const handleSubmit = async (values: CreateJournalEntryFormValues) => {
    const amount = Number(values.amount);
    const created = await createMutation.mutateAsync({
      journalNumber: values.journalNumber.trim(),
      journalDate: values.journalDate,
      description: values.description.trim(),
      referenceType: "MANUAL",
      referenceId: null,
      lines: [
        {
          accountId: values.debitAccountId,
          debit: amount,
          credit: 0,
          memo: values.memo?.trim() || "Debit",
          sortOrder: 0,
        },
        {
          accountId: values.creditAccountId,
          debit: 0,
          credit: amount,
          memo: values.memo?.trim() || "Credit",
          sortOrder: 1,
        },
      ],
    });

    onOpenChange(false);
    router.push(ROUTES.accountingJournalEntryDetail(created.id));
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="New journal entry"
      description="Create a manual draft journal entry with balanced debit and credit lines."
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="journalNumber"
            label="Journal number"
            placeholder="JE-MAN-001"
          />
          <TextField control={form.control} name="journalDate" label="Journal date" type="date" />
        </div>
        <TextField
          control={form.control}
          name="description"
          label="Description"
          placeholder="Adjusting entry"
        />
        <TextField
          control={form.control}
          name="amount"
          label="Amount"
          placeholder="0.00"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="debitAccountId">
              Debit account
            </label>
            <Select
              value={form.watch("debitAccountId")}
              onValueChange={(value) => {
                if (value) {
                  form.setValue("debitAccountId", value, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="debitAccountId" aria-label="Debit account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="creditAccountId">
              Credit account
            </label>
            <Select
              value={form.watch("creditAccountId")}
              onValueChange={(value) => {
                if (value) {
                  form.setValue("creditAccountId", value, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="creditAccountId" aria-label="Credit account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <TextField control={form.control} name="memo" label="Memo" placeholder="Optional" />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={createMutation.isPending}>
            Create journal
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
