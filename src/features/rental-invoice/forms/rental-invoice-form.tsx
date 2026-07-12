"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  createRentalInvoiceFormSchema,
  type CreateRentalInvoiceFormValues,
} from "../schemas";
import {
  useInvoiceableRentalOrders,
  useRentalInvoiceFilterOptions,
} from "../hooks";
import { RentalInvoiceLineItemsField } from "./rental-invoice-line-items-field";

type RentalInvoiceFormProps = {
  defaultValues?: Partial<CreateRentalInvoiceFormValues>;
  onSubmit: (values: CreateRentalInvoiceFormValues) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

const createDefaults: CreateRentalInvoiceFormValues = {
  invoiceNumber: "",
  rentalOrderId: "",
  customerId: "",
  invoiceDate: new Date().toISOString(),
  dueDate: "",
  notes: "",
  items: [
    {
      lineType: "RENTAL_CHARGE",
      description: "",
      quantity: 1,
      unitPrice: 0,
    },
  ],
};

export function RentalInvoiceForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: RentalInvoiceFormProps) {
  const { customerOptions, customerLabelById } = useRentalInvoiceFilterOptions();
  const form = useForm<CreateRentalInvoiceFormValues>({
    resolver: zodResolver(createRentalInvoiceFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const rentalOrderId = form.watch("rentalOrderId");
  const { data: invoiceableOrders = [], isLoading: ordersLoading } =
    useInvoiceableRentalOrders();

  const selectedOrder = invoiceableOrders.find((order) => order.id === rentalOrderId);

  useEffect(() => {
    if (selectedOrder) {
      form.setValue("customerId", selectedOrder.customerId, {
        shouldValidate: true,
      });
    }
  }, [selectedOrder, form]);

  const orderOptions = invoiceableOrders.map((order) => ({
    value: order.id,
    label: `${order.orderNumber} — ${customerLabelById.get(order.customerId) ?? order.customerId}`,
  }));

  const customerOptionsForSelect = customerOptions.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Invoice details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="invoiceNumber"
            label="Invoice number"
            placeholder="e.g. INV-2026-001"
            description="Unique identifier for this invoice."
          />
          <SelectField
            control={form.control}
            name="rentalOrderId"
            label="Completed rental order"
            placeholder={
              ordersLoading
                ? "Loading orders..."
                : orderOptions.length === 0
                  ? "No completed orders available"
                  : "Select rental order"
            }
            options={orderOptions}
            description="Only completed rental orders can be invoiced."
          />
          <SelectField
            control={form.control}
            name="customerId"
            label="Customer"
            placeholder="Select customer"
            options={customerOptionsForSelect}
            description="Must match the rental order customer."
          />
          <DatePickerField
            control={form.control}
            name="invoiceDate"
            label="Invoice date"
          />
          <DatePickerField
            control={form.control}
            name="dueDate"
            label="Due date"
            description="Optional payment due date."
          />
        </div>
        <TextAreaField
          control={form.control}
          name="notes"
          label="Notes"
          placeholder="Optional notes for this invoice"
          rows={3}
        />
      </SectionCard>

      <SectionCard title="Line items">
        <RentalInvoiceLineItemsField />
      </SectionCard>

      <div className="flex flex-wrap gap-3">
        <AppButton type="submit" loading={isSubmitting}>
          Create invoice
        </AppButton>
        <AppButton
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </AppButton>
      </div>
    </AppForm>
  );
}
