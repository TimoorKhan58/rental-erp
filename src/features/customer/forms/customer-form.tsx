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
  /** `dialog` hides the live preview sidebar for compact modal use. */
  layout?: "page" | "dialog";
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
    <Card className="sticky top-20 border-border bg-card shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col items-center text-center">
          <CustomerAvatar name={displayName} size="lg" className="ring-2 ring-border" />
          <p className="mt-3 font-heading text-lg font-semibold">{displayName}</p>
          <p className="text-sm text-muted-foreground">
            {customerCode.trim() || "Auto-generated"}
          </p>
          <div className="mt-2">
            <CustomerStatusBadge isActive={isActive} />
          </div>
        </div>
        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{phone.trim() || "—"}</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Preview of how this customer appears in the list.
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
  layout = "page",
}: CreateCustomerFormProps) {
  const form = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  const watched = form.watch(["name", "phone", "isActive"]);
  const isDialog = layout === "dialog";

  return (
    <div className={isDialog ? undefined : "app-grid [&>*:first-child]:lg:col-span-8 [&>*:last-child]:lg:col-span-4 [&>*]:sm:col-span-6"}>
      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard
          title="Customer information"
          description="Basic profile details for the new customer."
        >
          <p className="mb-4 text-sm text-muted-foreground">
            Code is assigned automatically on save.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              control={form.control}
              name="name"
              label="Customer name"
              placeholder="Full name"
              description="Required."
            />
            <TextField
              control={form.control}
              name="phone"
              label="Phone"
              placeholder="+92 300 1234567"
              description="Required."
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
              description="Required."
            />
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

      {isDialog ? null : (
        <CustomerFormPreview
          name={watched[0] ?? ""}
          customerCode="Auto-generated"
          phone={watched[1] ?? ""}
          isActive={watched[2] ?? true}
        />
      )}
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
    <div className="app-grid [&>*:first-child]:lg:col-span-8 [&>*:last-child]:lg:col-span-4 [&>*]:sm:col-span-6">
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
              description="Required."
            />
            <TextField
              control={form.control}
              name="phone"
              label="Phone"
              placeholder="+92 300 1234567"
              description="Required."
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
              description="Required."
            />
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
      <AppButton
        type="submit"
        className="bg-brand text-brand-foreground hover:bg-brand/90"
        loading={isSubmitting}
      >
        {submitLabel}
      </AppButton>
    </div>
  );
}
