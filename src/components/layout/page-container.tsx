import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  /**
   * `fluid` (default) — full application workspace after the sidebar.
   * `readable` — optional centered measure for text-heavy surfaces only.
   */
  width?: "fluid" | "readable";
};

/**
 * Primary page wrapper for the operational application canvas.
 * Fluid by default: no global max-width cap, responsive outer padding only.
 */
export function PageContainer({
  children,
  className,
  width = "fluid",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "app-workspace w-full min-w-0 flex-1 px-4 py-[var(--spacing-page-y)] sm:px-5 md:px-6 xl:px-8",
        width === "readable" && "mx-auto max-w-[var(--measure-prose)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
