import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppGridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

type AppGridProps = {
  children: ReactNode;
  className?: string;
  /** Accessible name for landmark sections using the grid as a region. */
  "aria-label"?: string;
};

/**
 * Shared 12-column fluid application grid.
 * Mobile: 1 column · Tablet (sm): 6 · Desktop (lg): 12.
 */
export function AppGrid({ children, className, "aria-label": ariaLabel }: AppGridProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn("app-grid", className)}
    >
      {children}
    </div>
  );
}

const lgSpanClass: Record<AppGridSpan, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

const smSpanClass: Partial<Record<AppGridSpan, string>> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
};

type AppGridItemProps = {
  children: ReactNode;
  className?: string;
  /** Desktop (lg+) span out of 12. Defaults to full width. */
  span?: AppGridSpan;
  /** Tablet (sm–lg) span out of 6. Defaults to full width of the 6-col track. */
  smSpan?: AppGridSpan;
  as?: "div" | "section" | "aside" | "article";
};

/**
 * Grid cell. Full width on mobile; optional sm/lg column spans.
 */
export function AppGridItem({
  children,
  className,
  span = 12,
  smSpan = 6,
  as: Comp = "div",
}: AppGridItemProps) {
  return (
    <Comp
      className={cn(
        "min-w-0 col-span-1",
        smSpanClass[Math.min(smSpan, 6) as AppGridSpan] ?? "sm:col-span-6",
        lgSpanClass[span],
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/** Readable prose width — for descriptions / intro copy only. */
export function ReadableText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("measure-prose", className)}>{children}</div>;
}
