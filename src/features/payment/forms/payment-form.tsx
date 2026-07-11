"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS } from "../types";
import {
  createPaymentFormSchema,
  updatePaymentFormSchema,
  type CreatePaymentFormValues,
  type UpdatePaymentFormValues,
} from "../schemas";
import { METHOD_LABELS } from "../mappers";
import { usePayableInvoices, usePaymentFilterOptions } from "../hooks";

type PaymentFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreatePaymentFormProps = PaymentFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreatePaymentFormValues>;
  onSubmit: (values: CreatePaymentFormValues) => void | Promise<void>;
};

type EditPaymentFormProps = PaymentFormBaseProps & {
  mode: "edit";
  paymentNumber: string;
  customerId: string;
  rentalInvoiceId: string;
  defaultValues: UpdatePaymentFormValues;
  onSubmit: (values: UpdatePaymentFormValues) => void | Promise<void>;
};

export type PaymentFormProps = CreatePaymentFormProps | EditPaymentFormProps;

const methodOptions = PAYMENT_METHODS.map((method) => ({
  value: method,
  label: METHOD_LABELS[method],
}));

const createDefaults: CreatePaymentFormValues = {
  paymentNumber: "",
  customerId: "",
  rentalInvoiceId: "",
  paymentDate: new Date().toISOString(),
  paymentMethod: "BANK_TRANSFER",
  referenceNumber: "",
  notes: "",
} as CreatePaymentFormValues;

export function PaymentForm(props: PaymentFormProps) {
  if (props.mode === "create") {
    return <CreatePaymentForm {...props} />;
  }

  return <EditPaymentForm {...props} />;
}

function CreatePaymentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreatePaymentFormProps) {
  const { customerOptions } = usePaymentFilterOptions();
  const form = useForm<CreatePaymentFormValues>({
    resolver: zodResolver(createPaymentFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const customerId = form.watch("customerId");
  const rentalInvoiceId = form.watch("rentalInvoiceId");
  const { data: payableInvoices = [] } = usePayableInvoices(customerId);

  const selectedInvoice = payableInvoices.find((invoice) => invoice.id === rentalInvoiceId);

  useEffect(() => {
    form.setValue("rentalInvoiceId", "");
  }, [customerId, form]);

  const invoiceOptions = payableInvoices.map((invoice) => ({
    value: invoice.id,
    label: `${invoice.invoiceNumber} — balance ${formatCurrency(invoice.balance)}`,
  }));

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Payment details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="paymentNumber"
            label="Payment number"
            placeholder="e.g. PAY-2026-001"
            description="Unique identifier for this payment."
          />
          <SelectField
            control={form.control}
            name="customerId"
            label="Customer"
            placeholder="Select customer"
            options={customerOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <SelectField
            control={form.control}
            name="rentalInvoiceId"
            label="Rental invoice"
            placeholder={customerId ? "Select invoice" : "Select a customer first"}
            options={invoiceOptions}
            disabled={!customerId || invoiceOptions.length === 0}
            description={
              selectedInvoice
                ? `Outstanding balance: ${formatCurrency(selectedInvoice.balance)}`
                : customerId && invoiceOptions.length === 0
                  ? "No payable invoices for this customer."
                  : undefined
            }
          />
          <DatePickerField
            control={form.control}
            name="paymentDate"
            label="Payment date"
          />
          <SelectField
            control={form.control}
            name="paymentMethod"
            label="Payment method"
            options={methodOptions}
          />
          <NumberField
            control={form.control}
            name="amount"
            label="Amount"
            min={0.01}
            step={0.01}
            description={
              selectedInvoice
                ? `Enter amount up to ${formatCurrency(selectedInvoice.balance)} (validated by backend).`
                : "Amount is validated against invoice balance by the backend."
            }
          />
          <TextField
            control={form.control}
            name="referenceNumber"
            label="Reference number"
            placeholder="Optional"
          />
          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Record payment
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditPaymentForm({
  paymentNumber,
  customerId,
  rentalInvoiceId,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditPaymentFormProps) {
  const { customerLabelById, invoiceLabelById } = usePaymentFilterOptions();
  const form = useForm<UpdatePaymentFormValues>({
    resolver: zodResolver(updatePaymentFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Payment details">
        <dl className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payment number
            </dt>
            <dd className="text-sm">{paymentNumber}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Customer
            </dt>
            <dd className="text-sm">{customerLabelById.get(customerId) ?? customerId}</dd>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Invoice
            </dt>
            <dd className="text-sm">
              {invoiceLabelById.get(rentalInvoiceId) ?? rentalInvoiceId}
            </dd>
          </div>
        </dl>

        <div className="grid gap-4 md:grid-cols-2">
          <DatePickerField
            control={form.control}
            name="paymentDate"
            label="Payment date"
          />
          <SelectField
            control={form.control}
            name="paymentMethod"
            label="Payment method"
            options={methodOptions}
          />
          <NumberField
            control={form.control}
            name="amount"
            label="Amount"
            min={0.01}
            step={0.01}
            description="Amount is validated against invoice balance by the backend."
          />
          <TextField
            control={form.control}
            name="referenceNumber"
            label="Reference number"
            placeholder="Optional"
          />
          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

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
