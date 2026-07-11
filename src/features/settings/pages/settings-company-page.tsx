"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import {
  AccessDeniedState,
  LoadingState,
  QueryErrorState,
} from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { SettingsSubNav } from "../components";
import { CompanyForm } from "../forms";
import { toCompanyUpdatePayload } from "../mappers";
import {
  useCompanySettings,
  useSettingsPermissions,
  useUpdateSettings,
} from "../hooks";
import type { UpdateCompanyFormValues } from "../schemas";

export function SettingsCompanyPage() {
  const { canReadSettings, canUpdateSettings, isLoading: permissionsLoading } =
    useSettingsPermissions();
  const { data: company, isLoading, isError, error, refetch } =
    useCompanySettings(canReadSettings);
  const updateSettings = useUpdateSettings();

  if (permissionsLoading || (canReadSettings && isLoading)) {
    return (
      <PageContainer>
        <LoadingState label="Loading company settings..." />
      </PageContainer>
    );
  }

  if (!canReadSettings) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view company settings." />
      </PageContainer>
    );
  }

  if (isError || !company) {
    return (
      <PageContainer>
        <QueryErrorState
          title="Failed to load company settings"
          description={error?.message ?? "An error occurred."}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateCompanyFormValues) => {
    await updateSettings.mutateAsync({ company: toCompanyUpdatePayload(values) });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Company"
        description="Organization and business configuration from the settings API."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Settings", href: ROUTES.settings },
          { label: "Company" },
        ]}
      />
      <SettingsSubNav />
      <CompanyForm
        company={company}
        canUpdate={canUpdateSettings}
        isSubmitting={updateSettings.isPending}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
