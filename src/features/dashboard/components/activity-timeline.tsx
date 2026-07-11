"use client";

import { memo } from "react";
import {
  ClipboardListIcon,
  CreditCardIcon,
  PackageIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { SectionCard } from "@/components/design-system/card";
import { SemanticBadge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import type { ActivityItem } from "../types";

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
      <SectionCard title="Recent Activity">
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Recent Activity" description="Latest system events">
      <ol className="space-y-4" aria-label="Recent activity timeline">
        {items.map((item) => {
          const Icon = activityIcons[item.icon as keyof typeof activityIcons] ?? ClipboardListIcon;

          return (
            <li key={item.id} className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
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
    </SectionCard>
  );
});
