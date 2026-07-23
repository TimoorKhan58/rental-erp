"use client";

import type { ReactNode } from "react";
import { Loader2Icon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

/**
 * AppButton — enterprise button with loading and icon composition.
 *
 * @example
 * <AppButton variant="default" leftIcon={<SearchIcon />}>Search</AppButton>
 * <AppButton loading>Saving...</AppButton>
 */
type AppButtonProps = ComponentProps<typeof Button> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    loadingLabel?: string;
  };

export function AppButton({
  children,
  className,
  variant,
  size,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  loadingLabel = "Loading",
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isIconOnly = Boolean(size?.startsWith("icon"));

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        // Ghost icon buttons need an explicit foreground so ⋯ menus stay
        // visible in both light and dark themes.
        isIconOnly && variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2Icon className="animate-spin" aria-hidden="true" data-icon="inline-start" />
      ) : leftIcon ? (
        <span data-icon="inline-start">{leftIcon}</span>
      ) : null}
      {isIconOnly ? (
        !loading && !leftIcon ? children : null
      ) : (
        <span>{loading ? loadingLabel : children}</span>
      )}
      {!loading && rightIcon ? <span data-icon="inline-end">{rightIcon}</span> : null}
    </Button>
  );
}

export { buttonVariants };
