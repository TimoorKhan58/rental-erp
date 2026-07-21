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
  active: "rounded-full border-transparent bg-success-muted text-success font-medium",
  inactive: "rounded-full border-transparent bg-muted text-muted-foreground font-medium",
  pending: "rounded-full border-transparent bg-warning-muted text-warning-foreground font-medium",
  paid: "rounded-full border-transparent bg-success-muted text-success font-medium",
  overdue: "rounded-full border-transparent bg-warning-muted text-warning-foreground font-medium",
  success: "rounded-full border-transparent bg-success-muted text-success font-medium",
  warning: "rounded-full border-transparent bg-warning-muted text-warning-foreground font-medium",
  error: "rounded-full border-transparent bg-error-muted text-error font-medium",
  info: "rounded-full border-transparent bg-muted text-foreground font-medium",
  draft: "rounded-full border-transparent bg-muted text-muted-foreground font-medium",
  archived: "rounded-full border-transparent bg-secondary text-secondary-foreground font-medium",
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
