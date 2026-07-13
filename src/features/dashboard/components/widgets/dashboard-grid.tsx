import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 12-column responsive grid for dashboard sections.
 * Gap defaults to 16px for denser layout.
 */
export function DashboardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-12 items-start gap-4", className)}>
      {children}
    </div>
  );
}

type DashboardColProps = {
  children: ReactNode;
  className?: string;
  /** Column span at lg+; stacks full-width below lg by default. */
  span?: 3 | 4 | 6 | 8 | 12;
};

const spanClass: Record<NonNullable<DashboardColProps["span"]>, string> = {
  3: "col-span-12 sm:col-span-6 lg:col-span-3",
  4: "col-span-12 sm:col-span-6 lg:col-span-4",
  6: "col-span-12 lg:col-span-6",
  8: "col-span-12 lg:col-span-8",
  12: "col-span-12",
};

export function DashboardCol({
  children,
  className,
  span = 12,
}: DashboardColProps) {
  return <div className={cn("min-w-0", spanClass[span], className)}>{children}</div>;
}
