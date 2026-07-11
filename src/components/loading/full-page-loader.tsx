import { Spinner } from "./spinner";

type FullPageLoaderProps = {
  label?: string;
};

export function FullPageLoader({ label = "Loading application..." }: FullPageLoaderProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="lg" label={label} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
