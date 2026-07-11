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
import { cn, formatDateTime } from "@/lib/utils";
import type {
  ListNotificationsParams,
  NotificationResponse,
  NotificationSortField,
} from "../types";
import { NotificationChannelBadge } from "./notification-channel-badge";
import { NotificationPriorityBadge } from "./notification-priority-badge";
import { NotificationStatusBadge } from "./notification-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";

type NotificationTableColumnOptions = {
  params: ListNotificationsParams;
  onSort: (
    field: NotificationSortField,
    order: ListNotificationsParams["sortOrder"],
  ) => void;
  canMarkRead: boolean;
  onMarkRead: (id: string) => void;
  isMarkingId?: string;
};

export function getNotificationTableColumns({
  params,
  onSort,
  canMarkRead,
  onMarkRead,
  isMarkingId,
}: NotificationTableColumnOptions): Array<DataTableColumn<NotificationResponse>> {
  return [
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
        <span className={cn(!row.isRead && "font-semibold")}>
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      id: "title",
      header: (
        <SortableColumnHeader
          label="Title"
          field="title"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-0 max-w-xs">
          <Link
            href={ROUTES.notificationDetail(row.id)}
            className={cn(
              "block truncate text-sm hover:underline",
              !row.isRead && "font-semibold",
            )}
          >
            {row.title}
            {!row.isRead ? <span className="sr-only"> (unread)</span> : null}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{row.body}</p>
        </div>
      ),
    },
    {
      id: "channel",
      header: (
        <SortableColumnHeader
          label="Type"
          field="channel"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <NotificationChannelBadge channel={row.channel} />,
    },
    {
      id: "priority",
      header: (
        <SortableColumnHeader
          label="Priority"
          field="priority"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <NotificationPriorityBadge priority={row.priority} />,
    },
    {
      id: "status",
      header: (
        <SortableColumnHeader
          label="Status"
          field="status"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <NotificationStatusBadge status={row.status} />,
    },
    {
      id: "isRead",
      header: (
        <SortableColumnHeader
          label="Read"
          field="isRead"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (row.isRead ? "Read" : "Unread"),
    },
    {
      id: "module",
      header: (
        <SortableColumnHeader
          label="Module"
          field="module"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.module,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <AppButton
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${row.title}`}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={ROUTES.notificationDetail(row.id)} />}>
              View detail
            </DropdownMenuItem>
            {canMarkRead && !row.isRead ? (
              <DropdownMenuItem
                disabled={isMarkingId === row.id}
                onClick={() => onMarkRead(row.id)}
              >
                Mark as read
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
