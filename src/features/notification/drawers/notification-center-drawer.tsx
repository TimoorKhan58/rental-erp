"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheckIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { AppDrawer } from "@/components/design-system/drawer";
import { AppButton } from "@/components/design-system/button";
import { EmptyState, LoadingState, QueryErrorState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationPermissions,
  useNotifications,
} from "../hooks";
import { NotificationListItem } from "../components/notification-list-item";
import type { NotificationResponse } from "../types";

type NotificationCenterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationCenterDrawer({
  open,
  onOpenChange,
}: NotificationCenterDrawerProps) {
  const router = useRouter();
  const { canRead, canUpdate } = useNotificationPermissions();
  const { data, isLoading, isError, error, refetch, isFetching } = useNotifications(
    { unread: true, page: 1, pageSize: 20 },
    open && canRead,
  );
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];

  const handleSelect = (notification: NotificationResponse) => {
    onOpenChange(false);
    if (canUpdate && !notification.isRead) {
      markRead.mutate(notification.id);
    }
    router.push(ROUTES.notificationDetail(notification.id));
  };

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description="Unread activity from the notification service."
      side="right"
      width="md"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<ExternalLinkIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.notifications} />}
            onClick={() => onOpenChange(false)}
          >
            View all
          </AppButton>
          <div className="flex gap-2">
            <AppButton
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
              onClick={() => void refetch()}
              loading={isFetching && !isLoading}
              aria-label="Refresh unread notifications"
            >
              Refresh
            </AppButton>
            {canUpdate ? (
              <AppButton
                variant="outline"
                size="sm"
                leftIcon={<CheckCheckIcon className="size-4" aria-hidden="true" />}
                onClick={() => markAllRead.mutate(undefined)}
                loading={markAllRead.isPending}
                disabled={items.length === 0}
              >
                Mark all read
              </AppButton>
            ) : null}
          </div>
        </div>
      }
    >
      {!canRead ? (
        <p className="text-sm text-muted-foreground" role="alert">
          You do not have permission to view notifications.
        </p>
      ) : isLoading ? (
        <LoadingState label="Loading notifications..." />
      ) : isError ? (
        <QueryErrorState
          title="Failed to load notifications"
          description={error?.message ?? "An error occurred."}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="No unread notifications right now."
        />
      ) : (
        <ul className="space-y-1" aria-label="Unread notifications">
          {items.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              onSelect={handleSelect}
              canMarkRead={canUpdate}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </ul>
      )}
    </AppDrawer>
  );
}
