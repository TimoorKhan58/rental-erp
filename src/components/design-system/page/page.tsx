import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Typography } from "@/components/design-system/typography";

/**
 * PageContainer — primary page width and padding wrapper.
 */
export function PageContainer({
  children,
  className,
  size = "app",
}: {
  children: ReactNode;
  className?: string;
  size?: "app" | "content" | "narrow" | "wide";
}) {
  const sizeClass = {
    app: "container-app max-w-[var(--container-app)]",
    content: "container-content max-w-[var(--container-content)] px-4 md:px-6",
    narrow: "container-narrow max-w-[var(--container-narrow)] px-4",
    wide: "container-wide max-w-[var(--container-wide)] px-4 md:px-6",
  }[size];

  return (
    <div className={cn("mx-auto w-full flex-1 py-[var(--spacing-page-y)]", sizeClass, className)}>
      {children}
    </div>
  );
}

/** ContentContainer — inner content region without page padding. */
export function ContentContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-[var(--spacing-section)]", className)}>
      {children}
    </div>
  );
}

/** PageTitle — standardized page heading. */
export function PageTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Typography variant="h1" as="h1" className={className}>
      {children}
    </Typography>
  );
}

/** PageDescription — standardized page subtitle. */
export function PageDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Typography variant="body" tone="muted" className={className}>
      {children}
    </Typography>
  );
}

/** PageActions — right-aligned action button group. */
export function PageActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

/** PageToolbar — horizontal toolbar for filters and actions. */
export function PageToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Section — vertical content section with spacing. */
export function Section({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn("space-y-[var(--spacing-stack-md)]", className)}
    >
      {children}
    </section>
  );
}

export { SectionHeader } from "@/components/shared/section-header";
