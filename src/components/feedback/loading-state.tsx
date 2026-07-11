import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/loading";

type LoadingStateProps = {
  label?: string;
  className?: string;
  children?: ReactNode;
};

export function LoadingState({
  label = "Loading...",
  className,
  children,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/10 p-8",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner label={label} />
      <p className="text-sm text-muted-foreground">{children ?? label}</p>
    </div>
  );
}
