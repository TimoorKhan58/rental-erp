"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  KeyRoundIcon,
  MailIcon,
  PencilIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { UserAvatar } from "./user-avatar";
import { UserRoleBadge } from "./user-role-badge";
import { UserStatusBadge } from "./user-status-badge";
import type { UserResponse } from "../types";

type UserProfileCardProps = {
  user: UserResponse;
  canUpdate: boolean;
  canDelete: boolean;
  onToggleStatus?: () => void;
  onResetPassword?: () => void;
};

export function UserProfileCard({
  user,
  canUpdate,
  canDelete,
  onToggleStatus,
  onResetPassword,
}: UserProfileCardProps) {
  const canActivate = !user.isActive && canUpdate;
  const canDeactivate = user.isActive && canDelete;

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft-md">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <UserAvatar name={user.name} size="lg" className="ring-4 ring-card" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
                {user.name}
              </h1>
              <UserStatusBadge isActive={user.isActive} />
              <UserRoleBadge role={user.role} />
            </div>
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MailIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {user.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.users} />}
          >
            Back
          </AppButton>
          {canActivate || canDeactivate ? (
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={
                user.isActive ? (
                  <UserXIcon className="size-4" aria-hidden="true" />
                ) : (
                  <UserCheckIcon className="size-4" aria-hidden="true" />
                )
              }
              onClick={onToggleStatus}
            >
              {user.isActive ? "Deactivate" : "Activate"}
            </AppButton>
          ) : null}
          {canUpdate ? (
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<KeyRoundIcon className="size-4" aria-hidden="true" />}
              onClick={onResetPassword}
            >
              Reset password
            </AppButton>
          ) : null}
          {canUpdate ? (
            <AppButton
              size="sm"
              leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.userEdit(user.id)} />}
            >
              Edit
            </AppButton>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
