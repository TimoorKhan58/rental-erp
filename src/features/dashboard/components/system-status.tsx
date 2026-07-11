"use client";

import { memo } from "react";
import { CheckCircle2Icon, AlertTriangleIcon, XCircleIcon } from "lucide-react";
import { SectionCard } from "@/components/design-system/card";
import { SemanticBadge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemStatusItem } from "../types";

const statusConfig = {
  healthy: {
    icon: CheckCircle2Icon,
    badge: "success" as const,
    label: "Healthy",
  },
  degraded: {
    icon: AlertTriangleIcon,
    badge: "warning" as const,
    label: "Degraded",
  },
  down: {
    icon: XCircleIcon,
    badge: "error" as const,
    label: "Down",
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
      <SectionCard title="System Status">
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="System Status" description="Platform health indicators">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-border/80 px-3 py-2.5"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
      </div>
    </SectionCard>
  );
});
