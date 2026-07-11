"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import { TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  updateProfileFormSchema,
  type UpdateProfileFormValues,
} from "../schemas";
import { ReadOnlyField } from "../components/read-only-field";
import { formatDateTime } from "@/lib/utils";
import type { UserProfileResponse } from "../types";

type ProfileFormProps = {
  profile: UserProfileResponse;
  canUpdate: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: UpdateProfileFormValues) => void | Promise<void>;
};

export function ProfileForm({
  profile,
  canUpdate,
  isSubmitting = false,
  onSubmit,
}: ProfileFormProps) {
  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
    },
  });

  useEffect(() => {
    form.reset({
      name: profile.name,
      email: profile.email,
    });
  }, [profile, form]);

  if (!canUpdate) {
    return (
      <SectionCard title="Profile">
        <dl className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Name" value={profile.name} />
          <ReadOnlyField label="Email" value={profile.email} />
          <ReadOnlyField label="Role" value={profile.role} />
          <ReadOnlyField label="Active" value={profile.isActive} />
          <ReadOnlyField label="Created" value={formatDateTime(profile.createdAt)} />
          <ReadOnlyField label="Updated" value={formatDateTime(profile.updatedAt)} />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Profile editing requires the identity:update permission. Phone, avatar, and
          job title are not provided by the identity API.
        </p>
      </SectionCard>
    );
  }

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Profile"
        actions={
          <AppButton type="submit" loading={isSubmitting} disabled={!form.formState.isDirty}>
            Save profile
          </AppButton>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField control={form.control} name="name" label="Name" />
          <TextField control={form.control} name="email" label="Email" type="email" />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Role" value={profile.role} />
          <ReadOnlyField label="Active" value={profile.isActive} />
          <ReadOnlyField label="Created" value={formatDateTime(profile.createdAt)} />
          <ReadOnlyField label="Updated" value={formatDateTime(profile.updatedAt)} />
        </dl>
      </SectionCard>
    </AppForm>
  );
}
