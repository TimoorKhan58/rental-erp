"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_TYPES,
} from "../types";
import {
  createExpenseFormSchema,
  updateExpenseFormSchema,
  type CreateExpenseFormValues,
  type UpdateExpenseFormValues,
} from "../schemas";
import { METHOD_LABELS, TYPE_LABELS } from "../mappers";
import { useExpenseFilterOptions, useExpensePermissions } from "../hooks";
import { CreateExpenseCategoryDialog } from "../components";

type ExpenseFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateExpenseFormProps = ExpenseFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateExpenseFormValues>;
  onSubmit: (values: CreateExpenseFormValues) => void | Promise<void>;
};

type EditExpenseFormProps = ExpenseFormBaseProps & {
  mode: "edit";
  expenseNumber: string;
  defaultValues: UpdateExpenseFormValues;
  onSubmit: (values: UpdateExpenseFormValues) => void | Promise<void>;
};

export type ExpenseFormProps = CreateExpenseFormProps | EditExpenseFormProps;

const typeOptions = EXPENSE_TYPES.map((type) => ({
  value: type,
  label: TYPE_LABELS[type],
}));

const methodOptions = [
  { value: "", label: "None" },
  ...EXPENSE_PAYMENT_METHODS.map((method) => ({
    value: method,
    label: METHOD_LABELS[method],
  })),
];

const createDefaults = {
  expenseNumber: "",
  expenseDate: new Date().toISOString(),
  categoryId: "",
  expenseType: "MANUAL" as const,
  paymentMethod: "",
  supplierId: "",
  vendorName: "",
  description: "",
  notes: "",
  referenceNumber: "",
} as CreateExpenseFormValues;

export function ExpenseForm(props: ExpenseFormProps) {
  if (props.mode === "create") {
    return <CreateExpenseForm {...props} />;
  }

  return <EditExpenseForm {...props} />;
}

function ExpenseFormFields({
  form,
  expenseNumber,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: ReturnType<typeof useForm<any>>;
  expenseNumber?: string;
}) {
  const { canCreate } = useExpensePermissions();
  const { categoryOptions, supplierOptions } = useExpenseFilterOptions();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const expenseType = form.watch("expenseType") as "VENDOR" | "MANUAL";

  return (
    <>
      <SectionCard title="Expense details">
        {expenseNumber ? (
          <dl className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Expense number
              </dt>
              <dd className="text-sm">{expenseNumber}</dd>
            </div>
          </dl>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            Expense number is assigned automatically on save (or enter your own).
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {!expenseNumber ? (
            <TextField
              control={form.control}
              name="expenseNumber"
              label="Expense number"
              placeholder="Leave blank to auto-generate"
            />
          ) : null}

          <DatePickerField
            control={form.control}
            name="expenseDate"
            label="Expense date"
          />

          <div className="space-y-2">
            <SelectField
              control={form.control}
              name="categoryId"
              label="Category"
              placeholder="Select category"
              options={categoryOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            {canCreate ? (
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<PlusIcon className="size-3.5" aria-hidden="true" />}
                onClick={() => setCategoryDialogOpen(true)}
              >
                New category
              </AppButton>
            ) : null}
          </div>

          <SelectField
            control={form.control}
            name="expenseType"
            label="Expense type"
            options={typeOptions}
          />

          <NumberField
            control={form.control}
            name="amount"
            label="Amount"
            min={0.01}
            step={0.01}
          />

          <SelectField
            control={form.control}
            name="paymentMethod"
            label="Payment method"
            options={methodOptions}
            placeholder="Optional"
          />

          {expenseType === "VENDOR" ? (
            <SelectField
              control={form.control}
              name="supplierId"
              label="Supplier"
              placeholder="Select supplier"
              options={supplierOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
          ) : (
            <TextField
              control={form.control}
              name="vendorName"
              label="Vendor name"
              placeholder="e.g. Local hardware store"
            />
          )}

          <TextField
            control={form.control}
            name="referenceNumber"
            label="Reference number"
            placeholder="Optional"
          />

          <TextAreaField
            control={form.control}
            name="description"
            label="Description"
            className="md:col-span-2"
            placeholder="What was this expense for?"
          />

          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            className="md:col-span-2"
            placeholder="Optional internal notes"
          />
        </div>
      </SectionCard>

      <CreateExpenseCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />
    </>
  );
}

function CreateExpenseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateExpenseFormProps) {
  const form = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <ExpenseFormFields form={form} />
      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Record expense
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditExpenseForm({
  expenseNumber,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditExpenseFormProps) {
  const form = useForm<UpdateExpenseFormValues>({
    resolver: zodResolver(updateExpenseFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <ExpenseFormFields form={form} expenseNumber={expenseNumber} />
      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Save changes
        </AppButton>
      </div>
    </AppForm>
  );
}
