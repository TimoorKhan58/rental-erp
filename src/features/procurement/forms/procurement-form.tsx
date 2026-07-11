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
  createProcurementFormSchema,
  updateProcurementFormSchema,
  type CreateProcurementFormValues,
  type UpdateProcurementFormValues,
} from "../schemas";
import { useProcurementFilterOptions } from "../hooks";
import { ProcurementLineItemsField } from "./procurement-line-items-field";

type ProcurementFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateProcurementFormProps = ProcurementFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateProcurementFormValues>;
  onSubmit: (values: CreateProcurementFormValues) => void | Promise<void>;
};

type EditProcurementFormProps = ProcurementFormBaseProps & {
  mode: "edit";
  poNumber: string;
  defaultValues: UpdateProcurementFormValues;
  onSubmit: (values: UpdateProcurementFormValues) => void | Promise<void>;
};

export type ProcurementFormProps = CreateProcurementFormProps | EditProcurementFormProps;

const createDefaults: CreateProcurementFormValues = {
  poNumber: "",
  supplierId: "",
  warehouseId: "",
  orderDate: new Date().toISOString(),
  expectedDate: "",
  remarks: "",
  items: [{ productId: "", quantity: 1, unitCost: 0 }],
};

export function ProcurementForm(props: ProcurementFormProps) {
  if (props.mode === "create") {
    return <CreateProcurementForm {...props} />;
  }

  return <EditProcurementForm {...props} />;
}

function CreateProcurementForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateProcurementFormProps) {
  const { supplierOptions, warehouseOptions, productOptions } = useProcurementFilterOptions();
  const form = useForm<CreateProcurementFormValues>({
    resolver: zodResolver(createProcurementFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Purchase order details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="poNumber"
            label="PO number"
            placeholder="e.g. PO-2026-001"
            description="Unique purchase order identifier."
          />
          <DatePickerField control={form.control} name="orderDate" label="Order date" />
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
          <DatePickerField
            control={form.control}
            name="expectedDate"
            label="Expected date"
            description="Optional expected delivery date."
          />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Line items">
        <ProcurementLineItemsField productOptions={productOptions} />
      </SectionCard>

      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={isSubmitting}>
          Create purchase order
        </AppButton>
      </div>
    </AppForm>
  );
}

function EditProcurementForm({
  poNumber,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditProcurementFormProps) {
  const { supplierOptions, warehouseOptions, productOptions } = useProcurementFilterOptions();
  const form = useForm<UpdateProcurementFormValues>({
    resolver: zodResolver(updateProcurementFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Purchase order details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              PO number
            </p>
            <p className="text-sm font-medium">{poNumber}</p>
            <p className="text-xs text-muted-foreground">
              PO number cannot be changed after creation.
            </p>
          </div>
          <DatePickerField control={form.control} name="orderDate" label="Order date" />
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
          <DatePickerField
            control={form.control}
            name="expectedDate"
            label="Expected date"
            description="Optional expected delivery date."
          />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks"
            className="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Line items">
        <ProcurementLineItemsField productOptions={productOptions} />
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
