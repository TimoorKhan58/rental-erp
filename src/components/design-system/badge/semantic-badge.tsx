import type { ComponentProps } from "react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

/**
 * Semantic badge variants mapped to design tokens.
 *
 * @example
 * <SemanticBadge variant="success">Active</SemanticBadge>
 * <SemanticBadge variant="pending">Pending</SemanticBadge>
 */
const semanticBadgeVariants = {
  active: "border-transparent bg-success-muted text-success",
  inactive: "border-transparent bg-muted text-muted-foreground",
  pending: "border-transparent bg-warning-muted text-warning-foreground",
  paid: "border-transparent bg-success-muted text-success",
  overdue: "border-transparent bg-error-muted text-error",
  success: "border-transparent bg-success-muted text-success",
  warning: "border-transparent bg-warning-muted text-warning-foreground",
  error: "border-transparent bg-error-muted text-error",
  info: "border-transparent bg-info-muted text-info",
  draft: "border-transparent bg-muted text-muted-foreground",
  archived: "border-transparent bg-secondary text-secondary-foreground",
} as const;

export type SemanticBadgeVariant = keyof typeof semanticBadgeVariants;

type SemanticBadgeProps = Omit<ComponentProps<typeof Badge>, "variant"> & {
  semantic?: SemanticBadgeVariant;
};

export function SemanticBadge({
  semantic = "draft",
  className,
  ...props
}: SemanticBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(semanticBadgeVariants[semantic], className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type VariantProps };
