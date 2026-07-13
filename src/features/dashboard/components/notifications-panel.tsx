"use client";

import { memo } from "react";
import Link from "next/link";
import { SemanticBadge } from "@/components/design-system/badge";
import { AppButton } from "@/components/design-system/button";
import { EmptyState } from "@/components/feedback";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import type { DashboardNotification } from "../types";
import { DashboardWidget, DashboardWidgetSkeleton } from "./widgets";

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
      <DashboardWidgetSkeleton title="Loading operational alerts">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </DashboardWidgetSkeleton>
    );
  }

  return (
    <DashboardWidget
      title="Operational Alerts"
      description="Latest alerts and system messages"
      actions={
        <>
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
        </>
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="New operational alerts will appear here when the system delivers them."
          className="min-h-0 border-0 bg-transparent p-3"
        />
      ) : (
        <ul className="space-y-1.5" aria-label="Operational alerts">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <Link
                href={ROUTES.notificationDetail(notification.id)}
                className="block rounded-lg border border-border/80 px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-sans text-sm font-medium text-foreground">
                    {notification.title}
                  </p>
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
                <p className="mt-1 line-clamp-2 font-sans text-sm text-muted-foreground">
                  {notification.message}
                </p>
                <time
                  className="mt-1.5 block font-sans text-xs text-muted-foreground"
                  dateTime={notification.timestamp}
                >
                  {formatDateTime(notification.timestamp)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
});
