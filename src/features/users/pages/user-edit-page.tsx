"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { AppBreadcrumb } from "@/components/design-system/navigation";
import { AccessDeniedState, LoadingState } from "@/components/feedback";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { useUpdateUser, useUser, useUsersPermissions } from "../hooks";
import { UserForm } from "../forms";
import { toUpdateUserPayload, toUserFormValues } from "../mappers";
import type { UpdateUserFormValues } from "../schemas";

type UserEditPageProps = {
  userId: string;
};

export function UserEditPage({ userId }: UserEditPageProps) {
  const router = useRouter();
  const { canUpdate, isLoading: permissionsLoading } = useUsersPermissions();
  const { data: user, isLoading, isError, error, refetch } = useUser(userId, canUpdate);
  const updateMutation = useUpdateUser();

  if (permissionsLoading || (canUpdate && isLoading)) {
    return (
      <PageContainer>
        <LoadingState label="Loading user..." />
      </PageContainer>
    );
  }

  if (!canUpdate) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to edit user accounts." />
      </PageContainer>
    );
  }

  if (isError || !user) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">User not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested user could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.users} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const handleSubmit = async (values: UpdateUserFormValues) => {
    await updateMutation.mutateAsync({
      id: userId,
      payload: toUpdateUserPayload(values),
    });
    router.push(ROUTES.userDetail(userId));
  };

  return (
    <PageContainer className="space-y-6">
      <header className="space-y-4">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", href: ROUTES.dashboard },
            { label: "Users", href: ROUTES.users },
            { label: user.name, href: ROUTES.userDetail(user.id) },
            { label: "Edit" },
          ]}
        />
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <PencilIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Edit user</h1>
            <p className="text-sm text-muted-foreground">Update profile for {user.name}.</p>
          </div>
        </div>
      </header>

      <UserForm
        mode="edit"
        defaultValues={toUserFormValues(user)}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTES.userDetail(userId))}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  );
}
