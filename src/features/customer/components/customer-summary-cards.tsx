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
    <Card className="border-border bg-card shadow-none">
      <CardContent className="flex items-center gap-3 p-3.5">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            iconClassName,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            <p className="font-heading text-xl font-semibold tracking-tight tabular-nums">
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
    <div className="grid gap-3 sm:grid-cols-3" aria-label="Customer summary">
      <SummaryCard
        label="Total"
        value={total}
        icon={UsersIcon}
        iconClassName="bg-primary/10 text-primary"
        isLoading={isLoading}
      />
      <SummaryCard
        label="Active"
        value={active}
        icon={UserCheckIcon}
        iconClassName="bg-success-muted text-success"
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
