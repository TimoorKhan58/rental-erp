"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import Link from "next/link";
import { EmptyState, EmptyStateActionButton, LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/constants/roles";
import { USER_ROLE_LIST, USER_ROLE_LABELS } from "@/constants/roles";
import { ROUTES } from "@/config/routes";
import { queryKeys } from "@/lib/query";
import { UserSummaryCards } from "../components/user-summary-cards";
import { ToggleUserStatusDialog } from "../dialogs/toggle-user-status-dialog";
import { ResetUserPasswordDialog } from "../dialogs/reset-user-password-dialog";
import {
  useRoles,
  useUserListParams,
  useUsers,
  useUsersPermissions,
} from "../hooks";
import { getUserTableColumns } from "./user-table-columns";
import type { UserResponse } from "../types";

type UserListTableProps = {
  onCreateClick?: () => void;
};

export function UserListTable({ onCreateClick }: UserListTableProps) {
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
  const { canRead, canCreate, canUpdate, canDelete } = useUsersPermissions();
  const { data, isLoading, isError, error, refetch, isFetching } = useUsers(params, canRead);
  const { data: roles = [] } = useRoles(canRead);
  const [statusTarget, setStatusTarget] = useState<UserResponse | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserResponse | null>(
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

  const roleOptions =
    roles.length > 0
      ? roles
      : USER_ROLE_LIST.map((name) => ({ name, label: USER_ROLE_LABELS[name] }));

  const columns = getUserTableColumns({
    params,
    onSort: setSorting,
    canUpdate,
    canDelete,
    onToggleStatus: setStatusTarget,
    onResetPassword: setResetPasswordTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) || params.isActive !== undefined || params.role !== undefined;

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load users</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <>
      <UserSummaryCards
        total={data?.meta.total ?? 0}
        isLoading={isLoading}
      />

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
                  <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
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
                    {roleOptions.map((role) => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.label}
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
                    : "Get started by creating your first user account."
                }
                action={
                  canCreate ? (
                    onCreateClick ? (
                      <EmptyStateActionButton onClick={onCreateClick}>
                        Create user
                      </EmptyStateActionButton>
                    ) : (
                      <Link href={ROUTES.usersNew}>
                        <EmptyStateActionButton>Create user</EmptyStateActionButton>
                      </Link>
                    )
                  ) : undefined
                }
              />
            }
            loadingState={<LoadingState label="Loading users..." />}
            pagination={
              data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
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

      <ResetUserPasswordDialog
        user={resetPasswordTarget}
        open={Boolean(resetPasswordTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResetPasswordTarget(null);
          }
        }}
      />
    </>
  );
}
