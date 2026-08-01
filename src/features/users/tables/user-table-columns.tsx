"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { UserRoleBadge } from "../components/user-role-badge";
import { UserStatusBadge } from "../components/user-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type {
  IdentityUserResponse,
  ListUsersParams,
  UserSortField,
} from "../types";

export type UserTableColumnOptions = {
  params: ListUsersParams;
  onSort: (field: UserSortField, order: ListUsersParams["sortOrder"]) => void;
  canUpdate: boolean;
  canDelete: boolean;
  currentUserId?: string;
  onToggleStatus: (user: IdentityUserResponse) => void;
  onResetPassword: (user: IdentityUserResponse) => void;
};

export function getUserTableColumns({
  params,
  onSort,
  canUpdate,
  canDelete,
  currentUserId,
  onToggleStatus,
  onResetPassword,
}: UserTableColumnOptions): Array<DataTableColumn<IdentityUserResponse>> {
  return [
    {
      id: "name",
      header: (
        <SortableColumnHeader
          label="Name"
          field="name"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={ROUTES.userDetail(row.id)}
          className="font-medium text-foreground hover:text-primary"
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: "email",
      header: (
        <SortableColumnHeader
          label="Email"
          field="email"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.email}</span>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (row) => <UserRoleBadge role={row.role} />,
    },
    {
      id: "isActive",
      header: (
        <SortableColumnHeader
          label="Status"
          field="isActive"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <UserStatusBadge isActive={row.isActive} />,
    },
    {
      id: "lastLogin",
      header: "Last login",
      cell: () => (
        <span className="text-sm text-muted-foreground" title="Not available from identity API">
          —
        </span>
      ),
    },
    {
      id: "createdAt",
      header: (
        <SortableColumnHeader
          label="Created"
          field="createdAt"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => {
        const isSelf = currentUserId !== undefined && row.id === currentUserId;
        const canToggleStatus =
          (row.isActive ? canDelete || canUpdate : canUpdate) && !isSelf;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${row.name}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={ROUTES.userDetail(row.id)} />}>
                View details
              </DropdownMenuItem>
              {canUpdate ? (
                <DropdownMenuItem render={<Link href={ROUTES.userEdit(row.id)} />}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onResetPassword(row)}>
                  Reset password
                </DropdownMenuItem>
              ) : null}
              {canToggleStatus ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant={row.isActive ? "destructive" : "default"}
                    onClick={() => onToggleStatus(row)}
                  >
                    {row.isActive ? "Disable" : "Enable"}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      className: cn("w-12 text-right"),
      headerClassName: "w-12",
    },
  ];
}
