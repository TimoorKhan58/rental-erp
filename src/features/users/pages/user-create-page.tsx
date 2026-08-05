"use client";

import { useRouter } from "next/navigation";
import { UserPlusIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { AccessDeniedState, LoadingState } from "@/components/feedback";
import { AppBreadcrumb } from "@/components/design-system/navigation";
import { ROUTES } from "@/config/routes";
import { useCreateUser, useUsersPermissions } from "../hooks";
import { UserForm } from "../forms";
import { toCreateUserPayload } from "../mappers";
import type { CreateUserFormValues } from "../schemas";

export function UserCreatePage() {
  const router = useRouter();
  const { canCreate, isLoading: permissionsLoading } = useUsersPermissions();
  const createMutation = useCreateUser();

  if (permissionsLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading..." />
      </PageContainer>
    );
  }

  if (!canCreate) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to create user accounts." />
      </PageContainer>
    );
  }

  const handleSubmit = async (values: CreateUserFormValues) => {
    const user = await createMutation.mutateAsync(toCreateUserPayload(values));
    router.push(ROUTES.userDetail(user.id));
  };

  return (
    <PageContainer className="space-y-6">
      <header className="space-y-4">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", href: ROUTES.dashboard },
            { label: "Users", href: ROUTES.users },
            { label: "New user" },
          ]}
        />
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <UserPlusIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">New user</h1>
            <p className="text-sm text-muted-foreground">
              Create an enterprise user account with role assignment and access status.
            </p>
          </div>
        </div>
      </header>

      <UserForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.users)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}
