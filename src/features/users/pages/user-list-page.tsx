"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AppButton } from "@/components/design-system/button";
import { AccessDeniedState, LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useIdentityPermissions } from "../hooks";
import { UserListTable } from "../tables";

export function UserListPage() {
  const { canRead, canCreate, isLoading } = useIdentityPermissions();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Checking permissions..." />
      </PageContainer>
    );
  }

  if (!canRead) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view users." />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage ERP user accounts, roles, and access status."
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
