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
  createCustomerFormSchema,
  updateCustomerFormSchema,
  type CreateCustomerFormValues,
  type UpdateCustomerFormValues,
} from "../schemas";

type CustomerFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateCustomerFormProps = CustomerFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateCustomerFormValues>;
  onSubmit: (values: CreateCustomerFormValues) => void | Promise<void>;
};

type EditCustomerFormProps = CustomerFormBaseProps & {
  mode: "edit";
  defaultValues: UpdateCustomerFormValues;
  onSubmit: (values: UpdateCustomerFormValues) => void | Promise<void>;
};

export type CustomerFormProps = CreateCustomerFormProps | EditCustomerFormProps;

const createDefaults: CreateCustomerFormValues = {
  customerCode: "",
  name: "",
  phone: "",
  cnic: "",
  address: "",
  notes: "",
  isActive: true,
};

export function CustomerForm(props: CustomerFormProps) {
  if (props.mode === "create") {
    return <CreateCustomerForm {...props} />;
  }

  return <EditCustomerForm {...props} />;
}

function CreateCustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateCustomerFormProps) {
  const form = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Customer information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="customerCode"
            label="Customer code"
            placeholder="e.g. CUST-001"
            description="Unique identifier for this customer."
          />
          <TextField
            control={form.control}
            name="name"
            label="Customer name"
            placeholder="Full name"
          />
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            placeholder="+92 300 1234567"
          />
          <TextField
            control={form.control}
            name="cnic"
            label="CNIC"
            placeholder="12345-1234567-1"
            description="Optional national ID."
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
          label="Active customer"
          description="Inactive customers cannot be assigned to new rentals."
        />
      </SectionCard>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Create customer" />
    </AppForm>
  );
}

function EditCustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditCustomerFormProps) {
  const form = useForm<UpdateCustomerFormValues>({
    resolver: zodResolver(updateCustomerFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard title="Customer information">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Customer name"
            placeholder="Full name"
          />
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            placeholder="+92 300 1234567"
          />
          <TextField
            control={form.control}
            name="cnic"
            label="CNIC"
            placeholder="12345-1234567-1"
            description="Optional national ID."
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
          label="Active customer"
          description="Inactive customers cannot be assigned to new rentals."
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
