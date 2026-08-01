"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { KeyRoundIcon, ShieldIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppBreadcrumb } from "@/components/design-system/navigation";
import { AppButton } from "@/components/design-system/button";
import {
  AccessDeniedState,
  LoadingState,
} from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  useCurrentIdentityProfile,
  useIdentityPermissions,
  useUser,
  useUserPermissionsDetail,
} from "../hooks";
import { UserProfileCard } from "../components";
import { UserRoleBadge } from "../components/user-role-badge";
import { UserStatusBadge } from "../components/user-status-badge";
import { ResetPasswordDialog } from "../dialogs/reset-password-dialog";
import { ToggleUserStatusDialog } from "../dialogs/toggle-user-status-dialog";

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
  const { canRead, canUpdate, canDelete, isLoading: permissionsLoading } =
    useIdentityPermissions();
  const { data: currentProfile } = useCurrentIdentityProfile(canRead);
  const { data: user, isLoading, isError, error, refetch } = useUser(
    userId,
    canRead,
  );
  const { data: permissionsDetail } = useUserPermissionsDetail(
    userId,
    canRead,
  );
  const [statusOpen, setStatusOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

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
        <AccessDeniedState description="You do not have permission to view users." />
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

  const isSelf = currentProfile?.id === user.id;
  const canDisable = (user.isActive ? canDelete || canUpdate : canUpdate) && !isSelf;

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
        canDisable={canDisable}
        onToggleStatus={() => setStatusOpen(true)}
        onResetPassword={() => setResetOpen(true)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Account details"
            description="Identity profile managed by the identity module."
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Name" value={user.name} />
              <DetailField label="Email" value={user.email} />
              <DetailField
                label="Role"
                value={<UserRoleBadge role={user.role} />}
                icon={<ShieldIcon className="size-4" aria-hidden="true" />}
              />
              <DetailField
                label="Status"
                value={<UserStatusBadge isActive={user.isActive} />}
              />
              <DetailField
                label="Last login"
                value="—"
                icon={<KeyRoundIcon className="size-4" aria-hidden="true" />}
              />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Last login is not exposed by the current identity API.
            </p>
          </SectionCard>

          <SectionCard
            title="Permissions"
            description={`Effective permissions for the ${user.role} role.`}
          >
            {permissionsDetail?.permissions?.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {permissionsDetail.permissions.map((permission) => (
                  <li
                    key={permission}
                    className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 font-mono text-xs"
                  >
                    {permission}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No permissions returned for this user.
              </p>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Account timeline">
            <dl className="space-y-3">
              <DetailField label="Created" value={formatDate(user.createdAt)} />
              <DetailField
                label="Last updated"
                value={formatDateTime(user.updatedAt)}
              />
              <DetailField label="User ID" value={user.id} />
            </dl>
          </SectionCard>
        </div>
      </div>

      <ToggleUserStatusDialog
        user={user}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />

      <ResetPasswordDialog
        user={user}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />
    </PageContainer>
  );
}
