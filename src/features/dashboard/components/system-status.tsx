"use client";

import { memo } from "react";
import { ActivityIcon, CheckCircle2Icon, AlertTriangleIcon, XCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SemanticBadge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SystemStatusItem } from "../types";

const statusConfig = {
  healthy: {
    icon: CheckCircle2Icon,
    badge: "success" as const,
    label: "Healthy",
    className: "bg-chart-2/12 text-chart-2",
  },
  degraded: {
    icon: AlertTriangleIcon,
    badge: "warning" as const,
    label: "Degraded",
    className: "bg-chart-3/12 text-chart-3",
  },
  down: {
    icon: XCircleIcon,
    badge: "error" as const,
    label: "Down",
    className: "bg-destructive/10 text-destructive",
  },
};

type SystemStatusSectionProps = {
  items: SystemStatusItem[];
  isLoading?: boolean;
};

export const SystemStatusSection = memo(function SystemStatusSection({
  items,
  isLoading,
}: SystemStatusSectionProps) {
  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-token-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base">System Status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-token-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <ActivityIcon className="size-4 text-primary" aria-hidden="true" />
          System Status
        </CardTitle>
        <p className="text-sm text-muted-foreground">Platform health indicators</p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  config.className,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.label}</p>
                  <SemanticBadge semantic={config.badge}>{config.label}</SemanticBadge>
                </div>
                <p className="text-xs text-muted-foreground">{item.message}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
