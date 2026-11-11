"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import { NumberField, TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  updatePreferencesFormSchema,
  type UpdatePreferencesFormValues,
} from "../schemas";
import { ThemePreferenceControl } from "../components/theme-preference-control";
import type { UserPreferencesView } from "../types";

type PreferencesFormProps = {
  preferences: UserPreferencesView;
  canUpdate: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: UpdatePreferencesFormValues) => void | Promise<void>;
  onResetRequest?: () => void;
};

export function PreferencesForm({
  preferences,
  canUpdate,
  isSubmitting = false,
  onSubmit,
  onResetRequest,
}: PreferencesFormProps) {
  const form = useForm<UpdatePreferencesFormValues>({
    resolver: zodResolver(updatePreferencesFormSchema),
    defaultValues: preferences,
  });

  useEffect(() => {
    form.reset(preferences);
  }, [preferences, form]);

  const disabled = !canUpdate;

  return (
    <div className="space-y-6">
      <SectionCard title="Appearance">
        <ThemePreferenceControl />
      </SectionCard>

      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard
          title="Locale & formats"
          description="Language, timezone, and currency code update on-screen formatting after save. Pattern fields are stored only."
          actions={
            canUpdate ? (
              <div className="flex flex-wrap gap-2">
                {onResetRequest ? (
                  <AppButton type="button" variant="outline" onClick={onResetRequest}>
                    Reset defaults
                  </AppButton>
                ) : null}
                <AppButton
                  type="submit"
                  loading={isSubmitting}
                  disabled={!form.formState.isDirty}
                >
                  Save preferences
                </AppButton>
              </div>
            ) : null
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              control={form.control}
              name="language"
              label="Language"
              description="Locale used by on-screen date and money formatting after save."
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="timezone"
              label="Timezone"
              description="Used by on-screen date and time formatting after save."
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="dateFormat"
              label="Date format"
              description="Stored preference. Dates currently format from the language/timezone locale."
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="timeFormat"
              label="Time format"
              description="Stored preference. Times currently format from the language/timezone locale."
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="numberFormat"
              label="Number format"
              description="Stored preference. Numbers currently format from the language locale."
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="currencyCode"
              label="Currency code"
              description="ISO 4217 code used by on-screen money formatting after save."
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="currencySymbol"
              label="Currency symbol"
              description="Stored display symbol. Live formatting uses the currency code."
              disabled={disabled}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Dashboard preferences"
          description="Stored in system settings. The current Dashboard does not read these values."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              control={form.control}
              name="defaultDashboardView"
              label="Default dashboard view"
              description="Stored label only. Dashboard layout is not switched from this field."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="recentItemsLimit"
              label="Recent items limit"
              description="Stored preference. Dashboard lists do not apply this limit."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="chartDefaultPeriodDays"
              label="Chart default period (days)"
              description="Stored preference. Dashboard and reports use their own date ranges."
              disabled={disabled}
            />
          </div>
        </SectionCard>
      </AppForm>
    </div>
  );
}
