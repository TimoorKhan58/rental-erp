"use client";

import Link from "next/link";
import { PlusIcon, UserCogIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { AccessDeniedState, LoadingState } from "@/components/feedback";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { UserListTable } from "../tables";
import { useUsersPermissions } from "../hooks";

export function UserListPage() {
  const { canRead, canCreate, isLoading: permissionsLoading } = useUsersPermissions();

  if (permissionsLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading..." />
      </PageContainer>
    );
  }

  if (!canRead) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view user accounts." />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <UserCogIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Users</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Manage enterprise user accounts, roles, and access status across your organization.
            </p>
          </div>
        </div>
        {canCreate ? (
          <AppButton
            leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.usersNew} />}
          >
            New user
          </AppButton>
        ) : null}
      </header>

      <UserListTable />
    </PageContainer>
  );
}
