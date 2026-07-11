"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, AccessDeniedState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { SettingsSubNav } from "../components";
import { useSettingsPermissions } from "../hooks";

const SECTIONS = [
  {
    title: "Profile",
    description: "Your account name, email, and role.",
    href: ROUTES.settingsProfile,
    requires: "profile" as const,
  },
  {
    title: "Company",
    description: "Organization identity, address, and commerce defaults.",
    href: ROUTES.settingsCompany,
    requires: "settings" as const,
  },
  {
    title: "Preferences",
    description: "Theme, locale formats, and dashboard defaults.",
    href: ROUTES.settingsPreferences,
    requires: "settings" as const,
  },
  {
    title: "Security",
    description: "Password and session policy configuration.",
    href: ROUTES.settingsSecurity,
    requires: "settings" as const,
  },
];

export function SettingsOverviewPage() {
  const {
    isLoading,
    canReadProfile,
    canReadSettings,
  } = useSettingsPermissions();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Checking permissions..." />
      </PageContainer>
    );
  }

  if (!canReadProfile && !canReadSettings) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view settings." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Application configuration and account preferences."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Settings" },
        ]}
      />

      <SettingsSubNav />

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const allowed =
            section.requires === "profile" ? canReadProfile : canReadSettings;

          return (
            <SectionCard
              key={section.href}
              title={section.title}
              description={section.description}
              actions={
                allowed ? (
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={section.href} />}
                  >
                    Open
                  </AppButton>
                ) : (
                  <span className="text-xs text-muted-foreground">No access</span>
                )
              }
            >
              {!allowed ? (
                <p className="text-sm text-muted-foreground">
                  Required permission is missing for this section.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Manage {section.title.toLowerCase()} settings.
                </p>
              )}
            </SectionCard>
          );
        })}
      </div>
    </PageContainer>
  );
}
