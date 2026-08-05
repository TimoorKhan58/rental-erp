"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { MailIcon, ShieldIcon, UserIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppBreadcrumb } from "@/components/design-system/navigation";
import { AppButton } from "@/components/design-system/button";
import { AccessDeniedState, LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { useUser, useUsersPermissions } from "../hooks";
import { UserProfileCard } from "../components/user-profile-card";
import { UserRoleBadge } from "../components/user-role-badge";
import { UserStatusBadge } from "../components/user-status-badge";
import { ToggleUserStatusDialog } from "../dialogs/toggle-user-status-dialog";
import { ResetUserPasswordDialog } from "../dialogs/reset-user-password-dialog";

type UserDetailPageProps = {
  userId: string;
};

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
      {icon ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const {
    canRead,
    canUpdate,
    canDelete,
    isLoading: permissionsLoading,
  } = useUsersPermissions();
  const { data: user, isLoading, isError, error, refetch } = useUser(userId, canRead);
  const [statusOpen, setStatusOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  if (permissionsLoading || (canRead && isLoading)) {
    return (
      <PageContainer>
        <LoadingState label="Loading user details..." />
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

  if (isError || !user) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
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

  return (
    <PageContainer className="space-y-6">
      <AppBreadcrumb
        items={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Users", href: ROUTES.users },
          { label: user.name },
        ]}
      />

      <UserProfileCard
        user={user}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onToggleStatus={() => setStatusOpen(true)}
        onResetPassword={() => setResetPasswordOpen(true)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="User details"
            description="Identity profile for this enterprise account."
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Name"
                value={user.name}
                icon={<UserIcon className="size-4" aria-hidden="true" />}
              />
              <DetailField
                label="Email"
                value={user.email}
                icon={<MailIcon className="size-4" aria-hidden="true" />}
              />
              <DetailField
                label="Role"
                value={<UserRoleBadge role={user.role} />}
                icon={<ShieldIcon className="size-4" aria-hidden="true" />}
              />
              <DetailField
                label="Status"
                value={<UserStatusBadge isActive={user.isActive} />}
              />
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Account timeline">
            <dl className="space-y-3">
              <DetailField label="Created" value={formatDate(user.createdAt)} />
            </dl>
          </SectionCard>
        </div>
      </div>

      <ToggleUserStatusDialog
        user={user}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />

      <ResetUserPasswordDialog
        user={user}
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
      />
    </PageContainer>
  );
}
