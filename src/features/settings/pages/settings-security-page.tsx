"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import {
  AccessDeniedState,
  LoadingState,
  QueryErrorState,
} from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { SettingsSubNav } from "../components";
import {
  ChangePasswordForm,
} from "../forms/change-password-form";
import { ActiveSessionsPanel } from "../forms/active-sessions-panel";
import { SecurityForm } from "../forms/security-form";
import {
  useSecuritySettings,
  useSettingsPermissions,
  useUpdateSettings,
} from "../hooks";
import type { UpdateSecurityFormValues } from "../schemas";

type SettingsSecurityPageProps = {
  minPasswordLength: number;
};

export function SettingsSecurityPage({
  minPasswordLength,
}: SettingsSecurityPageProps) {
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
        description="Manage your password, signed-in devices, and organization security policy."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Settings", href: ROUTES.settings },
          { label: "Security" },
        ]}
      />
      <SettingsSubNav />
      <div className="space-y-6">
        <ChangePasswordForm minPasswordLength={minPasswordLength} />
        <ActiveSessionsPanel />
        {!canReadSettings ? (
          <AccessDeniedState description="You do not have permission to view organization security settings." />
        ) : isError || !security ? (
          <QueryErrorState
            title="Failed to load security settings"
            description={error?.message ?? "An error occurred."}
            onRetry={() => void refetch()}
          />
        ) : (
          <SecurityForm
            security={security}
            canUpdate={canUpdateSettings}
            isSubmitting={updateSettings.isPending}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </PageContainer>
  );
}
