"use client";

import { cn } from "@/lib/utils";

type InventoryStockLevelBarProps = {
  available: number;
  minimum: number;
  maximum: number | null;
  onHand: number;
  size?: "sm" | "md";
  className?: string;
};

function resolveFillPercent(available: number, minimum: number, maximum: number | null): number {
  const target = maximum ?? Math.max(minimum * 2, available, 1);
  return Math.min(100, Math.max(0, (available / target) * 100));
}

function resolveBarColor(available: number, minimum: number): string {
  if (available <= 0) {
    return "bg-destructive";
  }

  if (minimum > 0 && available <= minimum) {
    return "bg-warning";
  }

  return "bg-success";
}

export function InventoryStockLevelBar({
  available,
  minimum,
  maximum,
  onHand,
  size = "sm",
  className,
}: InventoryStockLevelBarProps) {
  const fillPercent = resolveFillPercent(available, minimum, maximum);
  const barColor = resolveBarColor(available, minimum);
  const isOverstock = maximum !== null && onHand > maximum;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
        role="progressbar"
        aria-valuenow={available}
        aria-valuemin={0}
        aria-valuemax={maximum ?? Math.max(minimum * 2, onHand, 1)}
        aria-label={`${available.toLocaleString()} available units`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isOverstock ? "bg-info" : barColor,
          )}
          style={{ width: `${fillPercent}%` }}
        />
        {minimum > 0 ? (
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/30"
            style={{
              left: `${resolveFillPercent(minimum, minimum, maximum ?? Math.max(minimum * 2, onHand, 1))}%`,
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      {size === "md" ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{available.toLocaleString()} available</span>
          {minimum > 0 ? <span>Reorder: {minimum.toLocaleString()}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
