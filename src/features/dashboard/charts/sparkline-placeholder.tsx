import { cn } from "@/lib/utils";

/**
 * SparklinePlaceholder — reserved area for future sparkline charts.
 */
export function SparklinePlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-8 w-full rounded bg-muted/50",
        "bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,var(--muted)_4px,var(--muted)_8px)]",
        className,
      )}
    />
  );
}
