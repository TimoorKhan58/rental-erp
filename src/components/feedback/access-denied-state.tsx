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
    </div>
  );
}
