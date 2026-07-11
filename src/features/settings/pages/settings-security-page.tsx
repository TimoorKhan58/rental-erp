"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import {
  AccessDeniedState,
  LoadingState,
  QueryErrorState,
} from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { SettingsSubNav } from "../components";
import { SecurityForm } from "../forms";
import {
  useSecuritySettings,
  useSettingsPermissions,
  useUpdateSettings,
} from "../hooks";
import type { UpdateSecurityFormValues } from "../schemas";

export function SettingsSecurityPage() {
  const { canReadSettings, canUpdateSettings, isLoading: permissionsLoading } =
    useSettingsPermissions();
  const { data: security, isLoading, isError, error, refetch } =
    useSecuritySettings(canReadSettings);
  const updateSettings = useUpdateSettings();

  if (permissionsLoading || (canReadSettings && isLoading)) {
    return (
      <PageContainer>
        <LoadingState label="Loading security settings..." />
      </PageContainer>
    );
  }

  if (!canReadSettings) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view security settings." />
      </PageContainer>
    );
  }

  if (isError || !security) {
    return (
      <PageContainer>
        <QueryErrorState
          title="Failed to load security settings"
          description={error?.message ?? "An error occurred."}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateSecurityFormValues) => {
    await updateSettings.mutateAsync({
      system: {
        minPasswordLength: values.minPasswordLength,
        maxLoginAttempts: values.maxLoginAttempts,
        lockoutDurationMinutes: values.lockoutDurationMinutes,
        requireEmailVerification: values.requireEmailVerification,
        allowPasswordReset: values.allowPasswordReset,
        sessionTimeoutMinutes: values.sessionTimeoutMinutes,
        rememberMeDurationDays: values.rememberMeDurationDays,
        maxConcurrentSessions: values.maxConcurrentSessions,
        passwordExpiryDays: values.passwordExpiryDays ?? null,
        ipWhitelistEnabled: values.ipWhitelistEnabled,
      },
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Security"
        description="Password and session policy fields from system settings."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Settings", href: ROUTES.settings },
          { label: "Security" },
        ]}
      />
      <SettingsSubNav />
      <SecurityForm
        security={security}
        canUpdate={canUpdateSettings}
        isSubmitting={updateSettings.isPending}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
