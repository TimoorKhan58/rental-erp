"use client";

import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import {
  AccessDeniedState,
  LoadingState,
  QueryErrorState,
} from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_SYSTEM_SETTINGS,
} from "@/modules/settings/domain/settings.constants";
import { SettingsSubNav } from "../components";
import { ResetPreferencesDialog } from "../dialogs";
import { PreferencesForm } from "../forms";
import {
  useSettingsPermissions,
  useUpdateSettings,
  useUserPreferences,
} from "../hooks";
import type { UpdatePreferencesFormValues } from "../schemas";

export function SettingsPreferencesPage() {
  const { canReadSettings, canUpdateSettings, isLoading: permissionsLoading } =
    useSettingsPermissions();
  const { data: preferences, isLoading, isError, error, refetch } =
    useUserPreferences(canReadSettings);
  const updateSettings = useUpdateSettings();
  const [resetOpen, setResetOpen] = useState(false);

  if (permissionsLoading || (canReadSettings && isLoading)) {
    return (
      <PageContainer>
        <LoadingState label="Loading preferences..." />
      </PageContainer>
    );
  }

  if (!canReadSettings) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view preferences." />
      </PageContainer>
    );
  }

  if (isError || !preferences) {
    return (
      <PageContainer>
        <QueryErrorState
          title="Failed to load preferences"
          description={error?.message ?? "An error occurred."}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdatePreferencesFormValues) => {
    await updateSettings.mutateAsync({
      company: {
        language: values.language,
        dateFormat: values.dateFormat,
        timeFormat: values.timeFormat,
        numberFormat: values.numberFormat,
        timezone: values.timezone,
        currencyCode: values.currencyCode,
        currencySymbol: values.currencySymbol,
      },
      system: {
        defaultDashboardView: values.defaultDashboardView,
        recentItemsLimit: values.recentItemsLimit,
        chartDefaultPeriodDays: values.chartDefaultPeriodDays,
      },
    });
  };

  const handleReset = () => {
    updateSettings.mutate(
      {
        company: {
          language: DEFAULT_COMPANY_SETTINGS.language,
          dateFormat: DEFAULT_COMPANY_SETTINGS.dateFormat,
          timeFormat: DEFAULT_COMPANY_SETTINGS.timeFormat,
          numberFormat: DEFAULT_COMPANY_SETTINGS.numberFormat,
          timezone: DEFAULT_COMPANY_SETTINGS.timezone,
          currencyCode: DEFAULT_COMPANY_SETTINGS.currencyCode,
          currencySymbol: DEFAULT_COMPANY_SETTINGS.currencySymbol,
        },
        system: {
          defaultDashboardView: DEFAULT_SYSTEM_SETTINGS.defaultDashboardView,
          recentItemsLimit: DEFAULT_SYSTEM_SETTINGS.recentItemsLimit,
          chartDefaultPeriodDays: DEFAULT_SYSTEM_SETTINGS.chartDefaultPeriodDays,
        },
      },
      {
        onSettled: () => setResetOpen(false),
      },
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Preferences"
        description="Locale, formats, dashboard defaults, and browser theme."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Settings", href: ROUTES.settings },
          { label: "Preferences" },
        ]}
      />
      <SettingsSubNav />
      <PreferencesForm
        preferences={preferences}
        canUpdate={canUpdateSettings}
        isSubmitting={updateSettings.isPending}
        onSubmit={handleSubmit}
        onResetRequest={
          canUpdateSettings ? () => setResetOpen(true) : undefined
        }
      />
      <ResetPreferencesDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        isPending={updateSettings.isPending}
        onConfirm={handleReset}
      />
    </PageContainer>
  );
}
