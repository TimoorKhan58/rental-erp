"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
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
    <PageContainer className="space-y-5">
      <PageHeader
        title="Users"
        description="Manage user accounts, roles, and sign-in status."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Users" },
        ]}
        actions={
          canCreate ? (
            <AppButton
              leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.usersNew} />}
            >
              New user
            </AppButton>
          ) : null
        }
      />

      <UserListTable />
    </PageContainer>
  );
}
