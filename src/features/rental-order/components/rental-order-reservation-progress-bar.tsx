"use client";

import { cn } from "@/lib/utils";

type RentalOrderReservationProgressBarProps = {
  reserved: number;
  total: number;
  size?: "sm" | "md";
  className?: string;
};

function resolveBarColor(reserved: number, total: number): string {
  if (total <= 0 || reserved <= 0) {
    return "bg-muted-foreground/30";
  }

  if (reserved >= total) {
    return "bg-success";
  }

  return "bg-warning";
}

export function RentalOrderReservationProgressBar({
  reserved,
  total,
  size = "sm",
  className,
}: RentalOrderReservationProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const fillPercent = Math.min(100, Math.max(0, (reserved / safeTotal) * 100));
  const barColor = resolveBarColor(reserved, total);

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
        role="progressbar"
        aria-valuenow={reserved}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${reserved.toLocaleString()} of ${total.toLocaleString()} units reserved`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      {size === "md" ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{reserved.toLocaleString()} reserved</span>
          <span>{total.toLocaleString()} ordered</span>
        </div>
      ) : null}
    </div>
  );
}
