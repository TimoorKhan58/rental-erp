"use client";

import { memo } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/design-system/card";
import { SemanticBadge } from "@/components/design-system/badge";
import { AppButton } from "@/components/design-system/button";
import { EmptyState } from "@/components/feedback";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import type { DashboardNotification } from "../types";

const severityToBadge = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
} as const;

type NotificationsPanelProps = {
  notifications: DashboardNotification[];
  isLoading?: boolean;
};

export const NotificationsPanel = memo(function NotificationsPanel({
  notifications,
  isLoading,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter((item) => !item.read).length;

  if (isLoading) {
    return (
      <SectionCard title="Notifications">
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Notifications"
      description="Latest alerts and system messages"
      actions={
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount} unread
            </Badge>
          ) : null}
          <AppButton
            variant="outline"
            size="sm"
            render={<Link href={ROUTES.notifications} />}
          >
            View all
          </AppButton>
        </div>
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="New notifications will appear here when the system delivers them."
        />
      ) : (
        <ul className="space-y-3" aria-label="Notification preview">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <Link
                href={ROUTES.notificationDetail(notification.id)}
                className="block rounded-lg border border-border/80 bg-background px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <SemanticBadge semantic={severityToBadge[notification.severity]}>
                        {notification.severity}
                      </SemanticBadge>
                      {!notification.read ? (
                        <span
                          className="size-2 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </div>
                <time
                  className="mt-1 block text-xs text-muted-foreground"
                  dateTime={notification.timestamp}
                >
                  {formatDateTime(notification.timestamp)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
});
