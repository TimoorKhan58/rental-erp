"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  createWarehouseFormSchema,
  updateWarehouseFormSchema,
  type CreateWarehouseFormValues,
  type UpdateWarehouseFormValues,
} from "../schemas";

type WarehouseFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateWarehouseFormProps = WarehouseFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateWarehouseFormValues>;
  onSubmit: (values: CreateWarehouseFormValues) => void | Promise<void>;
};

type EditWarehouseFormProps = WarehouseFormBaseProps & {
  mode: "edit";
  defaultValues: UpdateWarehouseFormValues;
  onSubmit: (values: UpdateWarehouseFormValues) => void | Promise<void>;
};

export type WarehouseFormProps = CreateWarehouseFormProps | EditWarehouseFormProps;

const createDefaults: CreateWarehouseFormValues = {
  warehouseCode: "",
  name: "",
  description: "",
  address: "",
  contactPerson: "",
  phone: "",
  isActive: true,
};

export function WarehouseForm(props: WarehouseFormProps) {
  if (props.mode === "create") {
    return <CreateWarehouseForm {...props} />;
  }

  return <EditWarehouseForm {...props} />;
}

function CreateWarehouseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateWarehouseFormProps) {
  const form = useForm<CreateWarehouseFormValues>({
    resolver: zodResolver(createWarehouseFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Warehouse information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="warehouseCode"
            label="Warehouse code"
            placeholder="e.g. WH-001"
            description="Unique identifier for this warehouse."
          />
          <TextField
            control={form.control}
            name="name"
            label="Warehouse name"
            placeholder="Main warehouse"
          />
          <TextField
            control={form.control}
            name="contactPerson"
            label="Contact person"
            placeholder="Manager name"
            description="Optional contact person."
          />
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            placeholder="+92 300 1234567"
            description="Optional contact phone."
          />
        </div>
      </SectionCard>

      <SectionCard title="Location & description">
        <div className="grid gap-4">
          <TextAreaField
            control={form.control}
            name="address"
            label="Address"
            rows={3}
          />
          <TextAreaField
            control={form.control}
            name="description"
            label="Description"
            rows={3}
          />
        </div>
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active warehouse"
          description="Inactive warehouses cannot receive new inventory assignments."
        />
      </SectionCard>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Create warehouse" />
    </AppForm>
  );
}

function EditWarehouseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditWarehouseFormProps) {
  const form = useForm<UpdateWarehouseFormValues>({
    resolver: zodResolver(updateWarehouseFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Warehouse information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Warehouse name"
            placeholder="Main warehouse"
          />
          <TextField
            control={form.control}
            name="contactPerson"
            label="Contact person"
            placeholder="Manager name"
            description="Optional contact person."
          />
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            placeholder="+92 300 1234567"
            description="Optional contact phone."
          />
        </div>
      </SectionCard>

      <SectionCard title="Location & description">
        <div className="grid gap-4">
          <TextAreaField
            control={form.control}
            name="address"
            label="Address"
            rows={3}
          />
          <TextAreaField
            control={form.control}
            name="description"
            label="Description"
            rows={3}
          />
        </div>
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active warehouse"
          description="Inactive warehouses cannot receive new inventory assignments."
        />
      </SectionCard>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Save changes" />
    </AppForm>
  );
}

function FormActions({
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <AppButton type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </AppButton>
      <AppButton type="submit" loading={isSubmitting}>
        {submitLabel}
      </AppButton>
    </div>
  );
}
