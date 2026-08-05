"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { UserAvatar } from "../components/user-avatar";
import { UserRoleBadge } from "../components/user-role-badge";
import { UserStatusBadge } from "../components/user-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { ListUsersParams, UserResponse, UserSortField } from "../types";

type UserTableColumnOptions = {
  params: ListUsersParams;
  onSort: (field: UserSortField, order: ListUsersParams["sortOrder"]) => void;
  canUpdate: boolean;
  canDelete: boolean;
  onToggleStatus: (user: UserResponse) => void;
  onResetPassword: (user: UserResponse) => void;
};

export function getUserTableColumns({
  params,
  onSort,
  canUpdate,
  canDelete,
  onToggleStatus,
  onResetPassword,
}: UserTableColumnOptions): Array<DataTableColumn<UserResponse>> {
  const columns: Array<DataTableColumn<UserResponse>> = [
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
          className="group flex items-center gap-3 rounded-lg py-0.5 transition-colors hover:opacity-90"
        >
          <UserAvatar name={row.name} size="sm" />
          <p className="truncate font-medium text-foreground group-hover:text-primary">
            {row.name}
          </p>
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
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => {
        const canActivate = !row.isActive && canUpdate;
        const canDeactivate = row.isActive && canDelete;

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
                  Edit user
                </DropdownMenuItem>
              ) : null}
              {canActivate || canDeactivate ? (
                <DropdownMenuItem onClick={() => onToggleStatus(row)}>
                  {row.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onResetPassword(row)}>
                  Reset password
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      className: cn("w-12 text-right"),
      headerClassName: "w-12",
    },
  ];

  return columns;
}
