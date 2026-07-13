"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared visual shell for dashboard sections.
 * Dense enterprise spacing: 16px padding · 12px radius · subtle border.
 */
type DashboardWidgetProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
};

export function DashboardWidget({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: DashboardWidgetProps) {
  return (
    <section
      aria-label={ariaLabel ?? title}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card shadow-none",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="min-w-0 space-y-0.5">
          <h2 className="font-sans text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="font-sans text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  );
}

type DashboardWidgetSkeletonProps = {
  title?: string;
  className?: string;
  children: ReactNode;
};

export function DashboardWidgetSkeleton({
  title = "Loading",
  className,
  children,
}: DashboardWidgetSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-label={title}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card shadow-none",
        className,
      )}
    >
      <div className="border-b border-border/60 px-4 py-2.5">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
