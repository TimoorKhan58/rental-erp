import type { ComponentProps, ElementType } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Typography — reusable text primitives mapped to design tokens.
 *
 * @example
 * <Typography variant="h1">Customers</Typography>
 * <Typography variant="body" tone="muted">Subtitle text</Typography>
 */
const typographyVariants = cva("text-foreground", {
  variants: {
    variant: {
      display: "text-[length:var(--text-display)] font-semibold leading-[var(--leading-tight)] tracking-tight",
      h1: "text-[length:var(--text-h1)] font-semibold leading-[var(--leading-tight)] tracking-tight",
      h2: "text-[length:var(--text-h2)] font-semibold leading-[var(--leading-snug)] tracking-tight",
      h3: "text-[length:var(--text-h3)] font-semibold leading-[var(--leading-snug)]",
      h4: "text-[length:var(--text-h4)] font-medium leading-[var(--leading-snug)]",
      title: "text-[length:var(--text-title)] font-medium leading-[var(--leading-snug)]",
      subtitle: "text-[length:var(--text-subtitle)] font-medium leading-[var(--leading-normal)]",
      body: "text-[length:var(--text-body)] leading-[var(--leading-normal)]",
      small: "text-[length:var(--text-small)] leading-[var(--leading-normal)]",
      caption: "text-[length:var(--text-caption)] leading-[var(--leading-normal)]",
      label: "text-[length:var(--text-label)] font-medium leading-none",
      mono: "font-mono text-[length:var(--text-mono)] leading-[var(--leading-normal)]",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
      error: "text-error",
      info: "text-info",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
  },
});

const defaultElements = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  title: "p",
  subtitle: "p",
  body: "p",
  small: "p",
  caption: "p",
  label: "label",
  mono: "code",
} as const;

type TypographyVariant = NonNullable<VariantProps<typeof typographyVariants>["variant"]>;

export type TypographyProps = {
  as?: ElementType;
  className?: string;
  children?: React.ReactNode;
  variant?: TypographyVariant;
  tone?: VariantProps<typeof typographyVariants>["tone"];
} & Omit<ComponentProps<"p">, "children">;

export function Typography({
  className,
  variant = "body",
  tone,
  as,
  children,
  ...props
}: TypographyProps) {
  const Component = (as ?? defaultElements[variant]) as ElementType;

  return (
    <Component className={cn(typographyVariants({ variant, tone }), className)} {...props}>
      {children}
    </Component>
  );
}

export { typographyVariants };
