"use client";

import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingState, AccessDeniedState, QueryErrorState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { SettingsSubNav } from "../components";
import { ProfileForm } from "../forms";
import {
  useProfile,
  useSettingsPermissions,
  useUpdateProfile,
} from "../hooks";
import type { UpdateProfileFormValues } from "../schemas";

export function SettingsProfilePage() {
  const { canReadProfile, canUpdateProfile, isLoading: permissionsLoading } =
    useSettingsPermissions();
  const { data: profile, isLoading, isError, error, refetch } = useProfile(
    canReadProfile,
  );
  const updateProfile = useUpdateProfile();

  if (permissionsLoading || (canReadProfile && isLoading)) {
    return (
      <PageContainer>
        <LoadingState label="Loading profile..." />
      </PageContainer>
    );
  }

  if (!canReadProfile) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view your profile." />
      </PageContainer>
    );
  }

  if (isError || !profile) {
    return (
      <PageContainer>
        <QueryErrorState
          title="Failed to load profile"
          description={error?.message ?? "An error occurred."}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateProfileFormValues) => {
    await updateProfile.mutateAsync({
      userId: profile.id,
      payload: values,
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Profile"
        description="Your identity account details from the user API."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Settings", href: ROUTES.settings },
          { label: "Profile" },
        ]}
      />
      <SettingsSubNav />
      <ProfileForm
        profile={profile}
        canUpdate={canUpdateProfile}
        isSubmitting={updateProfile.isPending}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
