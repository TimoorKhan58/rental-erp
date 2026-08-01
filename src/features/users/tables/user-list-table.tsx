"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { DataPagination, DataTableShell } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  EmptyState,
  EmptyStateActionButton,
  LoadingState,
} from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config/routes";
import { USER_ROLE_LABELS, USER_ROLE_LIST, type UserRole } from "@/constants/roles";
import { queryKeys } from "@/lib/query";
import {
  useCurrentIdentityProfile,
  useIdentityPermissions,
  useUserListParams,
  useUsers,
} from "../hooks";
import { getUserTableColumns } from "./user-table-columns";
import { ResetPasswordDialog } from "../dialogs/reset-password-dialog";
import { ToggleUserStatusDialog } from "../dialogs/toggle-user-status-dialog";
import type { IdentityUserResponse } from "../types";

export function UserListTable() {
  const queryClient = useQueryClient();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setStatusFilter,
    setRoleFilter,
    setSorting,
  } = useUserListParams();
  const { canCreate, canUpdate, canDelete } = useIdentityPermissions();
  const { data: currentProfile } = useCurrentIdentityProfile();
  const { data, isLoading, isError, error, refetch, isFetching } = useUsers(params);

  const [statusTarget, setStatusTarget] = useState<IdentityUserResponse | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<IdentityUserResponse | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const rows = useMemo(() => data?.items ?? [], [data?.items]);

  const columns = getUserTableColumns({
    params,
    onSort: setSorting,
    canUpdate,
    canDelete,
    currentUserId: currentProfile?.id,
    onToggleStatus: setStatusTarget,
    onResetPassword: setResetTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    params.isActive !== undefined ||
    params.role !== undefined;

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load users</p>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "An error occurred."}
        </p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <>
      <Card className="border-border/60 shadow-token-sm">
        <CardContent className="p-4 sm:p-6">
          <DataTableShell
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            className="space-y-4"
            search={
              <SearchInput
                value={localSearch}
                onChange={setLocalSearch}
                placeholder="Search by name or email..."
                className="w-full sm:max-w-sm"
                aria-label="Search users"
              />
            }
            filters={
              <>
                <Select
                  value={
                    params.isActive === undefined
                      ? "all"
                      : params.isActive
                        ? "active"
                        : "inactive"
                  }
                  onValueChange={(value) => {
                    if (value === "all") {
                      setStatusFilter(undefined);
                      return;
                    }

                    setStatusFilter(value === "active");
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={params.role ?? "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setRoleFilter(undefined);
                      return;
                    }

                    setRoleFilter(value as UserRole);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44" aria-label="Filter by role">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {USER_ROLE_LIST.map((role) => (
                      <SelectItem key={role} value={role}>
                        {USER_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            actions={
              <AppButton
                variant="outline"
                size="sm"
                leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
                onClick={handleRefresh}
                loading={isFetching && !isLoading}
                aria-label="Refresh user list"
              >
                Refresh
              </AppButton>
            }
            emptyState={
              <EmptyState
                title="No users found"
                description={
                  hasFilters
                    ? "Try adjusting your search or filters."
                    : "Get started by creating your first user."
                }
                action={
                  canCreate ? (
                    <Link href={ROUTES.usersNew}>
                      <EmptyStateActionButton>Create user</EmptyStateActionButton>
                    </Link>
                  ) : undefined
                }
              />
            }
            loadingState={<LoadingState label="Loading users..." />}
            pagination={
              data?.meta ? (
                <DataPagination meta={data.meta} onPageChange={setPage} />
              ) : null
            }
          />
        </CardContent>
      </Card>

      <ToggleUserStatusDialog
        user={statusTarget}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
          }
        }}
      />

      <ResetPasswordDialog
        user={resetTarget}
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
          }
        }}
      />
    </>
  );
}
