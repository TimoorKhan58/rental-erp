import type { ReactNode } from "react";
import { MetricCard } from "@/components/design-system/card";
import { cn } from "@/lib/utils";

type AnalyticsMetricTone = "default" | "attention" | "critical";

type AnalyticsMetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: AnalyticsMetricTone;
  className?: string;
};

const TONE_CLASS: Record<AnalyticsMetricTone, string> = {
  default: "",
  attention: "border-warning/30 bg-warning-muted",
  critical: "border-destructive/40 bg-destructive/5",
};

export function AnalyticsMetricCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: AnalyticsMetricCardProps) {
  return (
    <MetricCard
      label={label}
      value={value}
      hint={hint}
      className={cn(TONE_CLASS[tone], className)}
    />
  );
}
