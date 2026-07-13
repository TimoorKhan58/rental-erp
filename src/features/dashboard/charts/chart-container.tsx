import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ChartContainer — dense responsive wrapper for dashboard charts.
 */
type ChartContainerProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function ChartContainer({
  title,
  description,
  children,
  className,
  action,
}: ChartContainerProps) {
  return (
    <section
      aria-label={title}
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
        {action}
      </div>
      <div className="h-44 w-full min-w-0 px-3 pb-3 pt-2 sm:h-52">{children}</div>
    </section>
  );
}
