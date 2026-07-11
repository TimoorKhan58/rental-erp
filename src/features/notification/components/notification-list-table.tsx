"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCheckIcon, RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { EmptyState, LoadingState, QueryErrorState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query";
import { CHANNEL_LABELS, STATUS_LABELS } from "../mappers";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationStatus,
} from "../types";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationListParams,
  useNotificationPermissions,
  useNotifications,
} from "../hooks";
import { MarkAllReadDialog } from "../dialogs";
import { getNotificationTableColumns } from "./notification-list-table-columns";

export function NotificationListTable() {
  const queryClient = useQueryClient();
  const { canUpdate } = useNotificationPermissions();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setTypeFilter,
    setStatusFilter,
    setReadFilter,
    setDateRange,
    setSorting,
    readFilter,
  } = useNotificationListParams();

  const { data, isLoading, isError, error, refetch, isFetching } =
    useNotifications(params);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [confirmMarkAllOpen, setConfirmMarkAllOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const columns = useMemo(
    () =>
      getNotificationTableColumns({
        params,
        onSort: setSorting,
        canMarkRead: canUpdate,
        onMarkRead: (id) => markRead.mutate(id),
        isMarkingId: markRead.isPending ? markRead.variables : undefined,
      }),
    [params, setSorting, canUpdate, markRead],
  );

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.type) ||
    Boolean(params.status) ||
    Boolean(params.read) ||
    Boolean(params.unread) ||
    Boolean(params.fromDate) ||
    Boolean(params.toDate);

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    void refetch();
  };

  if (isError) {
    return (
      <QueryErrorState
        title="Failed to load notifications"
        description={error?.message ?? "An error occurred."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <DataTableShell
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search title, subject, body, module..."
            className="w-full sm:max-w-sm"
            aria-label="Search notifications"
          />
        }
        filters={
          <>
            <Select
              value={params.type ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setTypeFilter(undefined);
                  return;
                }
                setTypeFilter(value as NotificationChannel);
              }}
            >
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {CHANNEL_LABELS[channel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }
                setStatusFilter(value as NotificationStatus);
              }}
            >
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {NOTIFICATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={readFilter}
              onValueChange={(value) => {
                if (value === "read" || value === "unread" || value === "all") {
                  setReadFilter(value);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by read state">
                <SelectValue placeholder="Read state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={params.fromDate ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, params.toDate)
              }
              className="w-full sm:w-40"
              aria-label="From date"
            />
            <Input
              type="date"
              value={params.toDate ?? ""}
              onChange={(event) =>
                setDateRange(params.fromDate, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="To date"
            />
          </>
        }
        actions={
          <>
            {canUpdate ? (
              <AppButton
                variant="outline"
                size="sm"
                leftIcon={<CheckCheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => setConfirmMarkAllOpen(true)}
                aria-label="Mark all notifications as read"
              >
                Mark all read
              </AppButton>
            ) : null}
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
              onClick={handleRefresh}
              loading={isFetching && !isLoading}
              aria-label="Refresh notifications"
            >
              Refresh
            </AppButton>
          </>
        }
        emptyState={
          <EmptyState
            title="No notifications found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Notifications will appear here when system events are delivered."
            }
          />
        }
        loadingState={<LoadingState label="Loading notifications..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <MarkAllReadDialog
        open={confirmMarkAllOpen}
        onOpenChange={setConfirmMarkAllOpen}
        isPending={markAllRead.isPending}
        onConfirm={() => {
          markAllRead.mutate(undefined, {
            onSettled: () => setConfirmMarkAllOpen(false),
          });
        }}
      />
    </>
  );
}
