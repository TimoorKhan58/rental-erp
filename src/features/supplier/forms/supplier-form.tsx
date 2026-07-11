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
  createSupplierFormSchema,
  updateSupplierFormSchema,
  type CreateSupplierFormValues,
  type UpdateSupplierFormValues,
} from "../schemas";

type SupplierFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateSupplierFormProps = SupplierFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateSupplierFormValues>;
  onSubmit: (values: CreateSupplierFormValues) => void | Promise<void>;
};

type EditSupplierFormProps = SupplierFormBaseProps & {
  mode: "edit";
  defaultValues: UpdateSupplierFormValues;
  onSubmit: (values: UpdateSupplierFormValues) => void | Promise<void>;
};

export type SupplierFormProps = CreateSupplierFormProps | EditSupplierFormProps;

const createDefaults: CreateSupplierFormValues = {
  supplierCode: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
};

export function SupplierForm(props: SupplierFormProps) {
  if (props.mode === "create") {
    return <CreateSupplierForm {...props} />;
  }

  return <EditSupplierForm {...props} />;
}

function CreateSupplierForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateSupplierFormProps) {
  const form = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Supplier information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="supplierCode"
            label="Supplier code"
            placeholder="e.g. SUP-001"
            description="Unique identifier for this supplier."
          />
          <TextField
            control={form.control}
            name="name"
            label="Supplier name"
            placeholder="Company or contact name"
          />
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            placeholder="+92 300 1234567"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            placeholder="supplier@example.com"
            type="email"
            description="Optional contact email."
          />
        </div>
      </SectionCard>

      <SectionCard title="Address & notes">
        <div className="grid gap-4">
          <TextAreaField
            control={form.control}
            name="address"
            label="Address"
            rows={3}
          />
          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            rows={3}
          />
        </div>
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active supplier"
          description="Inactive suppliers cannot be used for new procurement."
        />
      </SectionCard>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Create supplier" />
    </AppForm>
  );
}

function EditSupplierForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditSupplierFormProps) {
  const form = useForm<UpdateSupplierFormValues>({
    resolver: zodResolver(updateSupplierFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Supplier information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Supplier name"
            placeholder="Company or contact name"
          />
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            placeholder="+92 300 1234567"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            placeholder="supplier@example.com"
            type="email"
            description="Optional contact email."
          />
        </div>
      </SectionCard>

      <SectionCard title="Address & notes">
        <div className="grid gap-4">
          <TextAreaField
            control={form.control}
            name="address"
            label="Address"
            rows={3}
          />
          <TextAreaField
            control={form.control}
            name="notes"
            label="Notes"
            rows={3}
          />
        </div>
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active supplier"
          description="Inactive suppliers cannot be used for new procurement."
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
