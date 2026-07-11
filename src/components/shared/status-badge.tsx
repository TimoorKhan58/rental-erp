import { cn } from "@/lib/utils";
import { SemanticBadge, type SemanticBadgeVariant } from "@/components/design-system/badge";

export type StatusTone = "default" | "success" | "warning" | "danger" | "info";

const toneToSemantic: Record<StatusTone, SemanticBadgeVariant> = {
  default: "draft",
  success: "success",
  warning: "warning",
  danger: "error",
  info: "info",
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  className?: string;
};

/**
 * StatusBadge — semantic status indicator using design tokens.
 */
export function StatusBadge({ label, tone = "default", className }: StatusBadgeProps) {
  return (
    <SemanticBadge semantic={toneToSemantic[tone]} className={cn(className)}>
      {label}
    </SemanticBadge>
  );
}
