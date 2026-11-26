"use client";

import Link from "next/link";
import { SectionCard } from "@/components/design-system/card";
import { ROUTES } from "@/config/routes";
import { ThemePreferenceControl } from "../components/theme-preference-control";
import type { UpdatePreferencesFormValues } from "../schemas";
import type { UserPreferencesView } from "../types";

type PreferencesFormProps = {
  preferences: UserPreferencesView;
  canUpdate: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: UpdatePreferencesFormValues) => void | Promise<void>;
  onResetRequest?: () => void;
};

/**
 * Preferences used to repeat the language, time zone and currency fields that
 * live under Company, plus "dashboard preferences" the dashboard never read
 * (usability revamp). What is left is what belongs here: how the screen looks.
 * The old stored values are untouched.
 */
export function PreferencesForm(_props: PreferencesFormProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="How the screen looks"
        description="Light, dark, or the same as your device. This is remembered on this computer only."
      >
        <ThemePreferenceControl />
      </SectionCard>

      <SectionCard title="Language, currency and time zone">
        <p className="text-sm text-muted-foreground">
          These are the same for everyone in your business, so they live with your company details.{" "}
          <Link href={ROUTES.settingsCompany} className="font-medium text-primary hover:underline">
            Open company settings
          </Link>
        </p>
      </SectionCard>
    </div>
  );
}
