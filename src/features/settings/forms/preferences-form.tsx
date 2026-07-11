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
          description="Stored in company settings."
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
            <TextField control={form.control} name="language" label="Language" disabled={disabled} />
            <TextField control={form.control} name="timezone" label="Timezone" disabled={disabled} />
            <TextField control={form.control} name="dateFormat" label="Date format" disabled={disabled} />
            <TextField control={form.control} name="timeFormat" label="Time format" disabled={disabled} />
            <TextField control={form.control} name="numberFormat" label="Number format" disabled={disabled} />
            <TextField control={form.control} name="currencyCode" label="Currency code" disabled={disabled} />
            <TextField control={form.control} name="currencySymbol" label="Currency symbol" disabled={disabled} />
          </div>
        </SectionCard>

        <SectionCard
          title="Dashboard preferences"
          description="Stored in system settings."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              control={form.control}
              name="defaultDashboardView"
              label="Default dashboard view"
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="recentItemsLimit"
              label="Recent items limit"
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="chartDefaultPeriodDays"
              label="Chart default period (days)"
              disabled={disabled}
            />
          </div>
        </SectionCard>
      </AppForm>
    </div>
  );
}
