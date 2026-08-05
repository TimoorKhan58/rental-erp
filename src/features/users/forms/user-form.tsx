"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  PasswordField,
  SelectField,
  SwitchField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { USER_ROLE_LABELS, USER_ROLE_LIST, USER_ROLES } from "@/constants/roles";
import {
  createUserFormSchema,
  updateUserFormSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "../schemas";
import { useRoles } from "../hooks";

type UserFormBaseProps = {
  onCancel: () => void;
  isSubmitting?: boolean;
  layout?: "page" | "dialog";
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
};

export type UserFormProps = CreateUserFormProps | EditUserFormProps;

const createDefaults: CreateUserFormValues = {
  name: "",
  email: "",
  password: "",
  role: USER_ROLES.VIEWER,
  isActive: true,
};

const fallbackRoleOptions = USER_ROLE_LIST.map((role) => ({
  value: role,
  label: USER_ROLE_LABELS[role],
}));

function useRoleOptions() {
  const { data: roles = [] } = useRoles();

  return roles.length > 0
    ? roles.map((role) => ({ value: role.name, label: role.label }))
    : fallbackRoleOptions;
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
    <div className="flex justify-end gap-3">
      <AppButton type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </AppButton>
      <AppButton type="submit" loading={isSubmitting}>
        {submitLabel}
      </AppButton>
    </div>
  );
}

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
  const roleOptions = useRoleOptions();
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { ...createDefaults, ...defaultValues },
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Account details"
        description="Basic identity information for the new user."
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
            placeholder="jane@example.com"
          />
          <PasswordField
            control={form.control}
            name="password"
            label="Password"
            description="Minimum 8 characters."
          />
          <SelectField
            control={form.control}
            name="role"
            label="Role"
            placeholder="Select a role"
            options={roleOptions}
          />
        </div>
      </SectionCard>

      <SectionCard title="Status" description="Inactive users cannot sign in.">
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active"
          description="Enable this account immediately."
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
}: EditUserFormProps) {
  const roleOptions = useRoleOptions();
  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues,
  });

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Account details"
        description="Update profile and role assignment."
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
            placeholder="jane@example.com"
          />
          <SelectField
            control={form.control}
            name="role"
            label="Role"
            placeholder="Select a role"
            options={roleOptions}
          />
        </div>
      </SectionCard>

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel="Save changes"
      />
    </AppForm>
  );
}
