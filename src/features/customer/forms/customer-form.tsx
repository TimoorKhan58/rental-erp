"use client";

import { useForm, type Control } from "react-hook-form";
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
  /** `dialog` is the compact modal use (no sticky bar). */
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

/** The same few boxes for a new and an existing customer. */
function CustomerFields({
  control,
  showStatus,
}: {
  control: Control<CreateCustomerFormValues> | Control<UpdateCustomerFormValues>;
  showStatus: boolean;
}) {
  const c = control as Control<CreateCustomerFormValues>;
  return (
    <>
      <SectionCard title="Who is the customer?">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField control={c} name="name" label="Name" placeholder="Full name" />
          <TextField
            control={c}
            name="phone"
            label="Phone"
            placeholder="0300 1234567"
            description="Used for calls and WhatsApp."
          />
          <TextField
            control={c}
            name="cnic"
            label="CNIC (optional)"
            placeholder="12345-1234567-1"
          />
        </div>
      </SectionCard>

      <SectionCard title="Where are they?">
        <div className="grid gap-4">
          <TextAreaField control={c} name="address" label="Address" rows={3} />
          <TextAreaField
            control={c}
            name="notes"
            label="Notes (optional)"
            rows={3}
            placeholder="Anything worth remembering about this customer"
          />
        </div>
      </SectionCard>

      {showStatus ? (
        <SectionCard title="Status">
          <SwitchField
            control={c}
            name="isActive"
            label="Active customer"
            description="Switch off to stop using this customer on new orders."
          />
        </SectionCard>
      ) : null}
    </>
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

  return (
    <AppForm form={form} onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <CustomerFields control={form.control} showStatus={false} />
      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel="Add customer"
        sticky={layout !== "dialog"}
      />
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
    <AppForm form={form} onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <CustomerFields control={form.control} showStatus />
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Save changes" sticky />
    </AppForm>
  );
}

function FormActions({
  onCancel,
  isSubmitting,
  submitLabel,
  sticky = false,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={
        sticky
          ? "sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0"
          : "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
      }
    >
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
