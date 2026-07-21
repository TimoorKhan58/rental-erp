"use client";

import { memo } from "react";
import {
  ClipboardListIcon,
  CreditCardIcon,
  PackageIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SemanticBadge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import type { ActivityItem } from "../types";

const activityIcons = {
  orders: ClipboardListIcon,
  payments: CreditCardIcon,
  inventory: PackageIcon,
  repairs: WrenchIcon,
  users: UsersIcon,
} as const;

const activityColors: Record<string, string> = {
  orders: "bg-chart-1/12 text-chart-1",
  payments: "bg-chart-2/12 text-chart-2",
  inventory: "bg-chart-3/12 text-chart-3",
  repairs: "bg-chart-5/12 text-chart-5",
  users: "bg-chart-4/12 text-chart-4",
};

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
      <Card className="border-border/60 shadow-token-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-token-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">Recent Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Latest system events</p>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0" aria-label="Recent activity timeline">
          {items.map((item, index) => {
            const Icon =
              activityIcons[item.icon as keyof typeof activityIcons] ?? ClipboardListIcon;
            const colorClass =
              activityColors[item.icon] ?? "bg-primary/12 text-primary";
            const isLast = index === items.length - 1;

            return (
              <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[18px] top-9 h-[calc(100%-12px)] w-px bg-border"
                  />
                ) : null}
                <div
                  className={cn(
                    "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl",
                    colorClass,
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <SemanticBadge semantic={statusToBadge[item.status]}>
                      {item.status}
                    </SemanticBadge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={item.timestamp}
                  >
                    {formatDateTime(item.timestamp)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
});
