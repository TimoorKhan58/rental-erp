"use client";

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
  createRentalOrderFormSchema,
  updateRentalOrderFormSchema,
  type CreateRentalOrderFormValues,
  type UpdateRentalOrderFormValues,
} from "../schemas";
import { useRentalOrderFilterOptions } from "../hooks";
import { RentalOrderLineItemsField } from "./rental-order-line-items-field";

type RentalOrderFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateRentalOrderFormProps = RentalOrderFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateRentalOrderFormValues>;
  onSubmit: (values: CreateRentalOrderFormValues) => void | Promise<void>;
};

type EditRentalOrderFormProps = RentalOrderFormBaseProps & {
  mode: "edit";
  orderNumber: string;
  defaultValues: UpdateRentalOrderFormValues;
  onSubmit: (values: UpdateRentalOrderFormValues) => void | Promise<void>;
};

export type RentalOrderFormProps = CreateRentalOrderFormProps | EditRentalOrderFormProps;

const createDefaults: CreateRentalOrderFormValues = {
  orderNumber: "",
  customerId: "",
  warehouseId: "",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  remarks: "",
  items: [{ productId: "", quantity: 1, dailyRate: 1 }],
};

export function RentalOrderForm(props: RentalOrderFormProps) {
  if (props.mode === "create") {
    return <CreateRentalOrderForm {...props} />;
  }

  return <EditRentalOrderForm {...props} />;
}

function CreateRentalOrderForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateRentalOrderFormProps) {
  const { customerOptions, warehouseOptions, productOptions } = useRentalOrderFilterOptions();
  const form = useForm<CreateRentalOrderFormValues>({
    resolver: zodResolver(createRentalOrderFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Rental order details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="orderNumber"
            label="Order number"
            placeholder="e.g. RO-2026-001"
            description="Unique identifier for this rental order."
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
            name="warehouseId"
            label="Warehouse"
            placeholder="Select warehouse"
            options={warehouseOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <DatePickerField control={form.control} name="startDate" label="Rental start date" />
          <DatePickerField control={form.control} name="endDate" label="Rental end date" />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Line items">
        <RentalOrderLineItemsField
          productOptions={productOptions}
          startDate={startDate}
          endDate={endDate}
        />
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Create rental order
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditRentalOrderForm({
  orderNumber,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditRentalOrderFormProps) {
  const { customerOptions, warehouseOptions, productOptions } = useRentalOrderFilterOptions();
  const form = useForm<UpdateRentalOrderFormValues>({
    resolver: zodResolver(updateRentalOrderFormSchema),
    defaultValues,
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Rental order details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Order number
            </p>
            <p className="text-sm font-medium">{orderNumber}</p>
            <p className="text-xs text-muted-foreground">
              Order number cannot be changed after creation.
            </p>
          </div>
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
            name="warehouseId"
            label="Warehouse"
            placeholder="Select warehouse"
            options={warehouseOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <DatePickerField control={form.control} name="startDate" label="Rental start date" />
          <DatePickerField control={form.control} name="endDate" label="Rental end date" />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Line items">
        <RentalOrderLineItemsField
          productOptions={productOptions}
          startDate={startDate}
          endDate={endDate}
        />
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
