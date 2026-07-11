"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ReportChartContainerProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function ReportChartContainer({
  title,
  description,
  children,
  className,
  action,
}: ReportChartContainerProps) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-xl border border-border bg-card p-4 shadow-token-sm", className)}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="h-56 w-full min-w-0 sm:h-64">{children}</div>
    </section>
  );
}
