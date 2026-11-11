import { cn } from "@/lib/utils";
import type { InventoryPresentationTone } from "../mappers/inventory-presentation.mapper";

type InventoryPresentationChipBadgeProps = {
  label: string;
  tone: InventoryPresentationTone;
  className?: string;
};

const toneClass: Record<InventoryPresentationTone, string> = {
  success: "border-success/25 bg-success-muted text-success",
  warning: "border-warning/30 bg-warning-muted text-warning-foreground",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/25 bg-info-muted text-info",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

export function InventoryPresentationChipBadge({
  label,
  tone,
  className,
}: InventoryPresentationChipBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
