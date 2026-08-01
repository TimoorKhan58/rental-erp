"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  SelectField,
  SwitchField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { USER_ROLE_LABELS, USER_ROLE_LIST } from "@/constants/roles";
import {
  createUserFormSchema,
  updateUserFormSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "../schemas";

const roleOptions = USER_ROLE_LIST.map((role) => ({
  value: role,
  label: USER_ROLE_LABELS[role],
}));

type UserFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
};

type CreateUserFormProps = UserFormBaseProps & {
  mode: "create";
  defaultValues?: Partial<CreateUserFormValues>;
  onSubmit: (values: CreateUserFormValues) => void | Promise<void>;
};

type EditUserFormProps = UserFormBaseProps & {
  mode: "edit";
  defaultValues: UpdateUserFormValues;
  onSubmit: (values: UpdateUserFormValues) => void | Promise<void>;
  /** When true, status switch is disabled (e.g. editing own account). */
  disableStatusToggle?: boolean;
};

export type UserFormProps = CreateUserFormProps | EditUserFormProps;

const createDefaults: CreateUserFormValues = {
  name: "",
  email: "",
  role: "viewer",
  isActive: true,
};

export function UserForm(props: UserFormProps) {
  if (props.mode === "create") {
    return <CreateUserForm {...props} />;
  }

  return <EditUserForm {...props} />;
}

function CreateUserForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateUserFormProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Account details"
        description="Create an ERP user. An invitation email will be sent so they can set their own password."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Full name"
            placeholder="Jane Doe"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="jane@company.com"
          />
          <SelectField
            control={form.control}
            name="role"
            label="Role"
            options={roleOptions}
            placeholder="Select role"
          />
        </div>
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active user"
          description="Inactive users cannot access protected APIs."
        />
      </SectionCard>

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel="Create user"
      />
    </AppForm>
  );
}

function EditUserForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  disableStatusToggle = false,
}: EditUserFormProps) {
  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Account details"
        description="Update profile, role, and account status."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Full name"
            placeholder="Jane Doe"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="jane@company.com"
          />
          <SelectField
            control={form.control}
            name="role"
            label="Role"
            options={roleOptions}
            placeholder="Select role"
          />
        </div>
      </SectionCard>

      <SectionCard title="Status">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active user"
          description={
            disableStatusToggle
              ? "You cannot disable your own account."
              : "Disabling a user revokes active sessions."
          }
          disabled={disableStatusToggle}
        />
      </SectionCard>

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel="Save changes"
      />
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
      <AppButton
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </AppButton>
      <AppButton type="submit" loading={isSubmitting}>
        {submitLabel}
      </AppButton>
    </div>
  );
}
