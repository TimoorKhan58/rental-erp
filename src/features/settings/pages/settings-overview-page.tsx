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
    description: "Your name, email and password.",
    href: ROUTES.settingsProfile,
    requires: "profile" as const,
  },
  {
    title: "Company",
    description: "Your company name, address, phone, currency and time zone.",
    href: ROUTES.settingsCompany,
    requires: "settings" as const,
  },
  {
    title: "Preferences",
    description: "Light or dark screen, language and date style.",
    href: ROUTES.settingsPreferences,
    requires: "settings" as const,
  },
  {
    title: "Security",
    description: "Change your password and see the sign-in rules.",
    href: ROUTES.settingsSecurity,
    requires: "settings" as const,
  },
];

export function SettingsOverviewPage() {
  const {
    isLoading,
    canReadProfile,
    canReadSettings,
    canUpdateSettings,
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
        description="Your business details, your profile and how RentCore looks."
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

      {canUpdateSettings && (
        <SectionCard
          className="mt-4"
          title="Export your data"
          description="Download everything your business has in RentCore as one zip file: customers, products, stock, orders, invoices, payments, accounts and more."
          actions={
            <AppButton variant="outline" size="sm" render={<a href="/api/settings/export" download />}>
              Download export
            </AppButton>
          }
        >
          <p className="text-sm text-muted-foreground">
            One spreadsheet (CSV) file per kind of record, which opens in Excel or Google Sheets. Passwords are not
            included. Each download is recorded in the audit log.
          </p>
        </SectionCard>
      )}
    </PageContainer>
  );
}
