import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

export function Spinner({ className, label = "Loading", size = "md" }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label={label}
      className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)}
    />
  );
}
