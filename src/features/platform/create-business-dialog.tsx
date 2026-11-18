"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { AppButton } from "@/components/design-system/button";
import { InlineError } from "@/components/design-system/feedback";
import { TextField } from "@/components/design-system/form";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { ApiClientError } from "@/lib/api";

import {
  createBusiness,
  generateTemporaryPassword,
  platformBusinessesKey,
  toSlug,
} from "./platform-api";
import { ShareCredentials } from "./share-credentials";

const formSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name").max(120),
  slug: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes"),
  currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/, "3 letters, e.g. PKR"),
  currencySymbol: z.string().trim().min(1, "Required").max(5),
  timezone: z.string().trim().min(3, "e.g. Asia/Karachi"),
  ownerName: z.string().trim().min(2, "Enter the owner's name").max(120),
  ownerEmail: z.string().trim().email("Enter a valid email"),
  temporaryPassword: z.string().min(8, "At least 8 characters").max(128),
});

type FormValues = z.infer<typeof formSchema>;

const defaults = (): FormValues => ({
  name: "",
  slug: "",
  currencyCode: "PKR",
  currencySymbol: "Rs",
  timezone: "Asia/Karachi",
  ownerName: "",
  ownerEmail: "",
  temporaryPassword: generateTemporaryPassword(),
});

/** Rendered only while open, so each opening starts with a fresh form. */
export function CreateBusinessDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults() });

  // Suggest the short name from the business name until it is edited.
  // useWatch (not form.watch) so it also works with the React Compiler.
  const name = useWatch({ control: form.control, name: "name" });
  const slugEdited = form.formState.dirtyFields.slug === true;
  useEffect(() => {
    if (!slugEdited) {
      form.setValue("slug", toSlug(name ?? ""), { shouldValidate: name !== "" });
    }
  }, [name, slugEdited, form]);

  const handleSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await createBusiness({
        name: values.name,
        slug: values.slug,
        currencyCode: values.currencyCode.toUpperCase(),
        currencySymbol: values.currencySymbol,
        timezone: values.timezone,
        owner: { name: values.ownerName, email: values.ownerEmail, temporaryPassword: values.temporaryPassword },
      });
      await queryClient.invalidateQueries({ queryKey: platformBusinessesKey });
      setCreated({ email: values.ownerEmail.trim().toLowerCase(), password: values.temporaryPassword });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not create the business.");
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AppModal
      open
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
      title={created ? "Business created" : "New business"}
      description={
        created
          ? "The business is ready to use: settings, numbering and chart of accounts are set up."
          : "Creates the business with its starter setup and its owner's login."
      }
      size="lg"
    >
      {created ? (
        <div className="space-y-4">
          <ShareCredentials email={created.email} password={created.password} />
          <div className="flex justify-end">
            <AppButton onClick={onClose}>Done</AppButton>
          </div>
        </div>
      ) : (
        <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="name" label="Business name" placeholder="Test Tents" disabled={isSubmitting} />
            <TextField
              control={form.control}
              name="slug"
              label="Short name"
              description="Lowercase, used to identify the business."
              disabled={isSubmitting}
            />
            <TextField control={form.control} name="currencyCode" label="Currency code" disabled={isSubmitting} />
            <TextField control={form.control} name="currencySymbol" label="Currency symbol" disabled={isSubmitting} />
            <TextField control={form.control} name="timezone" label="Time zone" disabled={isSubmitting} />
          </div>
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <TextField control={form.control} name="ownerName" label="Owner's name" disabled={isSubmitting} />
            <TextField control={form.control} name="ownerEmail" label="Owner's email" type="email" disabled={isSubmitting} />
            <TextField
              control={form.control}
              name="temporaryPassword"
              label="Temporary password"
              description="Generated for you; the owner changes it at first sign-in."
              disabled={isSubmitting}
            />
            <div className="flex items-end">
              <AppButton
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => form.setValue("temporaryPassword", generateTemporaryPassword(), { shouldValidate: true })}
              >
                Generate another
              </AppButton>
            </div>
          </div>
          {error !== null && <InlineError message={error} />}
          <div className="flex justify-end gap-3 pt-2">
            <AppButton type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton type="submit" loading={isSubmitting}>
              Create business
            </AppButton>
          </div>
        </AppForm>
      )}
    </AppModal>
  );
}
