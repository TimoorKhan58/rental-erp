import type { ReactNode } from "react";
import { InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center",
        className,
      )}
      role="status"
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon ?? <InboxIcon className="size-5" aria-hidden="true" />}
      </div>
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function EmptyStateActionButton(
  props: React.ComponentProps<typeof Button>,
) {
  return <Button variant="outline" size="sm" {...props} />;
}
