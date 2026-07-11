import { AppButton } from "@/components/design-system/button";

type QueryErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * Shared inline error panel for failed queries.
 * Keeps module pages visually consistent without redesign.
 */
export function QueryErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading this data.",
  onRetry,
  retryLabel = "Try again",
}: QueryErrorStateProps) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
      role="alert"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <AppButton variant="outline" onClick={onRetry}>
          {retryLabel}
        </AppButton>
      ) : null}
    </div>
  );
}
