import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * StandardCard — base content card with optional header/footer.
 *
 * @example
 * <StandardCard title="Overview" description="Summary metrics">...</StandardCard>
 */
type StandardCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "default" | "sm";
};

export function StandardCard({
  title,
  description,
  children,
  footer,
  className,
  size = "default",
}: StandardCardProps) {
  return (
    <Card size={size} className={cn("border-border shadow-none", className)}>
      {(title || description) && (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      )}
      {children ? <CardContent>{children}</CardContent> : null}
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}

export { MetricCard } from "@/components/shared/metric-card";
export { StatCard } from "@/components/shared/stat-card";

/**
 * SectionCard — grouped content block with section spacing.
 */
export function SectionCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * ActionCard — card with prominent call-to-action footer.
 */
export function ActionCard({
  title,
  description,
  children,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  action: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border shadow-none", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      <CardFooter className="justify-end">{action}</CardFooter>
    </Card>
  );
}

/**
 * EmptyCard — dashed placeholder card for empty content areas.
 */
export function EmptyCard({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-dashed bg-muted/20 shadow-none ring-0",
        className,
      )}
    >
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
        {action}
      </CardContent>
    </Card>
  );
}
