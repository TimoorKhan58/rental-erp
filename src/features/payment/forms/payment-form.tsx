"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  ComboboxField,
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
import { calendarDayToIso } from "@/lib/utils/local-date";

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
  paymentDate: calendarDayToIso(new Date()),
  paymentMethod: "CASH",
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
  const previousCustomerId = useRef<string | undefined>(undefined);

  const selectedInvoice = payableInvoices.find((invoice) => invoice.id === rentalInvoiceId);

  useEffect(() => {
    if (
      previousCustomerId.current !== undefined &&
      previousCustomerId.current !== customerId
    ) {
      form.setValue("rentalInvoiceId", "");
    }

    previousCustomerId.current = customerId;
  }, [customerId, form]);

  // One open invoice: pick it for them. Picking an invoice fills in the full balance
  // (unless they already typed their own amount), so the common case is one click.
  const autoAmount = useRef<number | null>(null);
  useEffect(() => {
    if (customerId && !rentalInvoiceId && payableInvoices.length === 1) {
      form.setValue("rentalInvoiceId", payableInvoices[0].id);
    }
  }, [customerId, rentalInvoiceId, payableInvoices, form]);
  useEffect(() => {
    if (!selectedInvoice) {
      return;
    }
    const current = Number(form.getValues("amount"));
    const untouched = !current || current === autoAmount.current;
    if (untouched) {
      autoAmount.current = selectedInvoice.balance;
      form.setValue("amount", selectedInvoice.balance, { shouldValidate: false });
    }
  }, [selectedInvoice, form]);

  const invoiceOptions = payableInvoices.map((invoice) => ({
    value: invoice.id,
    label: `${invoice.invoiceNumber} — balance ${formatCurrency(invoice.balance)}`,
  }));

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Payment details">
        <div className="grid gap-4 md:grid-cols-2">
          <ComboboxField
            control={form.control}
            name="customerId"
            label="Customer"
            placeholder="Choose a customer"
            searchPlaceholder="Search by name, code, or phone..."
            emptyMessage="No matching customers."
            options={customerOptions.map((option) => ({
              value: option.id,
              label: option.label,
              keywords: option.keywords,
            }))}
          />
          <ComboboxField
            control={form.control}
            name="rentalInvoiceId"
            label="Invoice"
            placeholder={customerId ? "Choose an invoice" : "Choose a customer first"}
            searchPlaceholder="Search invoice number..."
            emptyMessage="No matching invoices."
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
            label="Date received"
          />
          <SelectField
            control={form.control}
            name="paymentMethod"
            label="Paid by"
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
                ? `Up to ${formatCurrency(selectedInvoice.balance)} still owed on this invoice.`
                : "The amount can't be more than what is still owed on the invoice."
            }
          />
          <TextField
            control={form.control}
            name="referenceNumber"
            label="Reference"
            placeholder="Optional: cheque or transfer number"
          />
          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton
          type="submit"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          loading={isSubmitting}
        >
          Save payment
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
            label="Date received"
          />
          <SelectField
            control={form.control}
            name="paymentMethod"
            label="Paid by"
            options={methodOptions}
          />
          <NumberField
            control={form.control}
            name="amount"
            label="Amount"
            min={0.01}
            step={0.01}
            description="The amount can't be more than what is still owed on the invoice."
          />
          <TextField
            control={form.control}
            name="referenceNumber"
            label="Reference"
            placeholder="Optional: cheque or transfer number"
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
