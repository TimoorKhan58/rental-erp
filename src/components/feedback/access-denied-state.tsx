import Link from "next/link";
import { ROUTES } from "@/config/routes";

type AccessDeniedStateProps = {
  title?: string;
  description?: string;
};

/**
 * Inline RBAC denial panel for authenticated users missing a permission.
 */
export function AccessDeniedState({
  title = "Access denied",
  description = "You do not have permission to view this resource.",
}: AccessDeniedStateProps) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
      role="alert"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <Link
        href={ROUTES.dashboard}
        className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
