import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  /** How this number moved ("Up 18% on the time before"), coloured by whether that is good news. */
  change?: { text: string; tone: "good" | "bad" | "neutral" } | null;
  icon?: ReactNode;
  className?: string;
};

const CHANGE_TONE = {
  good: "text-success",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

export function MetricCard({
  label,
  value,
  hint,
  change,
  icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {change ? (
          <p className={cn("mt-1 text-xs font-medium", CHANGE_TONE[change.tone])}>{change.text}</p>
        ) : null}
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
