"use client";

import { UserCheckIcon, UsersIcon, UserXIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SummaryCardProps = {
  label: string;
  value: number;
  icon: typeof UsersIcon;
  iconClassName: string;
  isLoading?: boolean;
};

function SummaryCard({ label, value, icon: Icon, iconClassName, isLoading }: SummaryCardProps) {
  return (
    <Card className="border-border/60 shadow-token-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            iconClassName,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="font-heading text-2xl font-semibold tracking-tight">
              {value.toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type CustomerSummaryCardsProps = {
  total: number;
  active: number;
  inactive: number;
  isLoading?: boolean;
};

export function CustomerSummaryCards({
  total,
  active,
  inactive,
  isLoading,
}: CustomerSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryCard
        label="Total customers"
        value={total}
        icon={UsersIcon}
        iconClassName="bg-primary/12 text-primary"
        isLoading={isLoading}
      />
      <SummaryCard
        label="Active"
        value={active}
        icon={UserCheckIcon}
        iconClassName="bg-chart-2/12 text-chart-2"
        isLoading={isLoading}
      />
      <SummaryCard
        label="Inactive"
        value={inactive}
        icon={UserXIcon}
        iconClassName="bg-muted text-muted-foreground"
        isLoading={isLoading}
      />
    </div>
  );
}
