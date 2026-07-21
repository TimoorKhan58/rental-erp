import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTrend = "up" | "down" | "neutral";

type StatCardProps = {
  label: string;
  value: ReactNode;
  changeLabel?: string;
  trend?: StatTrend;
  className?: string;
};

const trendConfig: Record<
  StatTrend,
  { icon: typeof ArrowUpIcon; className: string }
> = {
  up: { icon: ArrowUpIcon, className: "text-success" },
  down: { icon: ArrowDownIcon, className: "text-error" },
  neutral: { icon: MinusIcon, className: "text-muted-foreground" },
};

export function StatCard({
  label,
  value,
  changeLabel,
  trend = "neutral",
  className,
}: StatCardProps) {
  const TrendIcon = trendConfig[trend].icon;

  return (
    <Card className={cn("border-border/60 shadow-token-sm transition-shadow duration-200 hover:shadow-token-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {changeLabel ? (
          <div className={cn("flex items-center gap-1 text-xs", trendConfig[trend].className)}>
            <TrendIcon className="size-3.5" aria-hidden="true" />
            <span>{changeLabel}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
