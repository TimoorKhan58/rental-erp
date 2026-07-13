"use client";

import { memo } from "react";
import {
  ClipboardListIcon,
  CreditCardIcon,
  PackageIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { SemanticBadge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import type { ActivityItem } from "../types";
import { DashboardWidget, DashboardWidgetSkeleton } from "./widgets";

const activityIcons = {
  orders: ClipboardListIcon,
  payments: CreditCardIcon,
  inventory: PackageIcon,
  repairs: WrenchIcon,
  users: UsersIcon,
} as const;

const statusToBadge = {
  success: "success",
  warning: "warning",
  info: "info",
  error: "error",
  pending: "pending",
} as const;

type ActivityTimelineProps = {
  items: ActivityItem[];
  isLoading?: boolean;
};

export const ActivityTimeline = memo(function ActivityTimeline({
  items,
  isLoading,
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <DashboardWidgetSkeleton title="Loading recent activity">
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </DashboardWidgetSkeleton>
    );
  }

  return (
    <DashboardWidget
      title="Recent Activity"
      description="Latest system events"
    >
      <ol className="divide-y divide-border/60" aria-label="Recent activity timeline">
        {items.map((item) => {
          const Icon =
            activityIcons[item.icon as keyof typeof activityIcons] ??
            ClipboardListIcon;

          return (
            <li key={item.id} className="flex gap-2.5 py-2 first:pt-0 last:pb-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                <Icon
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-sans text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <SemanticBadge semantic={statusToBadge[item.status]}>
                    {item.status}
                  </SemanticBadge>
                </div>
                <p className="font-sans text-xs text-muted-foreground">
                  {item.description}
                </p>
                <time
                  className="font-sans text-xs text-muted-foreground"
                  dateTime={item.timestamp}
                >
                  {formatDateTime(item.timestamp)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </DashboardWidget>
  );
});
