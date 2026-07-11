import type { ReactNode } from "react";
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  ShieldAlertIcon,
  WrenchIcon,
  ClockIcon,
  BanIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/feedback/empty-state";
import { UnauthorizedState } from "@/components/feedback/unauthorized-state";

/**
 * InlineError — compact inline validation or action error.
 */
export function InlineError({
  message,
  className,
}: {
  message: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={cn("flex items-center gap-1.5 text-xs text-error", className)}
    >
      <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/** InlineSuccess — compact inline success message. */
export function InlineSuccess({
  message,
  className,
}: {
  message: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn("flex items-center gap-1.5 text-xs text-success", className)}
    >
      <CheckCircle2Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/** EmptyResults — standardized empty search/list result. */
export function EmptyResults({
  title = "No results found",
  description = "Try adjusting your search or filters.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <EmptyState title={title} description={description} action={action} />
  );
}

/** NoPermission — permission denied feedback block. */
export function NoPermission({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <UnauthorizedState
      title={title ?? "Access denied"}
      description={description ?? "You do not have permission to view this content."}
    />
  );
}

/** MaintenanceNotice — system maintenance banner. */
export function MaintenanceNotice({
  title = "Scheduled maintenance",
  description = "Some features may be temporarily unavailable.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning-muted px-4 py-3 text-sm text-warning-foreground"
    >
      <WrenchIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-warning-foreground/90">{description}</p>
      </div>
    </div>
  );
}

/** ComingSoon — placeholder for unreleased features. */
export function ComingSoon({
  title = "Coming soon",
  description = "This feature is under development and will be available in a future release.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={<ClockIcon className="size-5" aria-hidden="true" />}
    />
  );
}

/** FeatureDisabled — disabled feature notice. */
export function FeatureDisabled({
  title = "Feature disabled",
  description = "This feature is currently disabled for your organization.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="status"
      className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center"
    >
      <BanIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/** NoPermission icon variant for inline use */
export function NoPermissionIcon({ className }: { className?: string }) {
  return <ShieldAlertIcon className={cn("size-5 text-muted-foreground", className)} aria-hidden="true" />;
}
