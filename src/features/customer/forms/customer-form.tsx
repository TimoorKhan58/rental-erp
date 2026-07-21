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
import { Card, CardContent } from "@/components/ui/card";
import {
  createCustomerFormSchema,
  updateCustomerFormSchema,
  type CreateCustomerFormValues,
  type UpdateCustomerFormValues,
} from "../schemas";
import { CustomerAvatar } from "../components/customer-avatar";
import { CustomerStatusBadge } from "../components/customer-status-badge";

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
  customerCode?: string;
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

function CustomerFormPreview({
  name,
  customerCode,
  phone,
  isActive,
}: {
  name: string;
  customerCode: string;
  phone: string;
  isActive: boolean;
}) {
  const displayName = name.trim() || "New customer";

  return (
    <Card className="sticky top-20 border-border/60 shadow-token-sm">
      <div className="h-16 bg-gradient-to-r from-primary/15 to-chart-2/10" />
      <CardContent className="relative space-y-4 px-5 pb-5">
        <div className="-mt-8 flex flex-col items-center text-center">
          <CustomerAvatar name={displayName} size="lg" className="ring-4 ring-card" />
          <p className="mt-3 font-heading text-lg font-semibold">{displayName}</p>
          <p className="text-sm text-primary">{customerCode.trim() || "Code pending"}</p>
          <div className="mt-2">
            <CustomerStatusBadge isActive={isActive} />
          </div>
        </div>
        <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{phone.trim() || "—"}</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Live preview of how this customer will appear in the list.
        </p>
      </CardContent>
    </Card>
  );
}

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

  const watched = form.watch(["name", "customerCode", "phone", "isActive"]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard
          title="Customer information"
          description="Basic profile details for the new customer."
        >
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
            <TextAreaField control={form.control} name="address" label="Address" rows={3} />
            <TextAreaField control={form.control} name="notes" label="Notes" rows={3} />
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

      <CustomerFormPreview
        name={watched[0] ?? ""}
        customerCode={watched[1] ?? ""}
        phone={watched[2] ?? ""}
        isActive={watched[3] ?? true}
      />
    </div>
  );
}

function EditCustomerForm({
  defaultValues,
  customerCode,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EditCustomerFormProps) {
  const form = useForm<UpdateCustomerFormValues>({
    resolver: zodResolver(updateCustomerFormSchema),
    defaultValues,
  });

  const watched = form.watch(["name", "phone", "isActive"]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard
          title="Customer information"
          description="Update profile and contact details."
        >
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
            <TextAreaField control={form.control} name="address" label="Address" rows={3} />
            <TextAreaField control={form.control} name="notes" label="Notes" rows={3} />
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

      <CustomerFormPreview
        name={watched[0] ?? ""}
        customerCode={customerCode ?? "—"}
        phone={watched[1] ?? ""}
        isActive={watched[2] ?? true}
      />
    </div>
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
