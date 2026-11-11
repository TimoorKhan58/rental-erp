"use client";

import { memo } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";
import { SemanticBadge } from "@/components/design-system/badge";
import { AppButton } from "@/components/design-system/button";
import { EmptyState } from "@/components/feedback";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const severityLabel = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  error: "Error",
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
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-x-3 gap-y-2 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <BellIcon className="size-4 text-primary" aria-hidden="true" />
            Notifications
          </CardTitle>
          <p className="text-sm text-muted-foreground">Latest alerts</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {unreadCount > 0 ? (
            <Badge variant="destructive" aria-label={`${unreadCount} unread notifications`}>
              {unreadCount}
            </Badge>
          ) : null}
          <AppButton variant="outline" size="sm" render={<Link href={ROUTES.notifications} />}>
            View all
          </AppButton>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="New notifications will appear here when the system delivers them."
            className="min-h-32 border-0 bg-transparent p-4"
          />
        ) : (
          <ul className="space-y-2" aria-label="Notification preview">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href={ROUTES.notificationDetail(notification.id)}
                  aria-label={`${severityLabel[notification.severity]} — ${notification.title}${notification.read ? "" : " (unread)"}`}
                  className="block rounded-md border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <SemanticBadge semantic={severityToBadge[notification.severity]}>
                        {severityLabel[notification.severity]}
                      </SemanticBadge>
                      {!notification.read ? (
                        <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <time
                      className="block text-xs text-muted-foreground"
                      dateTime={notification.timestamp}
                    >
                      {formatDateTime(notification.timestamp)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
