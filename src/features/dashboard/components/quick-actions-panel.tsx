"use client";

import Link from "next/link";
import { memo } from "react";
import {
  CreditCardIcon,
  FileTextIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartIcon,
  UserPlusIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { QuickAction } from "../types";

const actionConfig: Record<
  string,
  { icon: typeof PlusIcon; className: string }
> = {
  "new-customer": { icon: UserPlusIcon, className: "bg-chart-1/12 text-chart-1" },
  "new-rental": { icon: FileTextIcon, className: "bg-primary/12 text-primary" },
  "new-invoice": { icon: FileTextIcon, className: "bg-chart-4/12 text-chart-4" },
  "receive-payment": { icon: CreditCardIcon, className: "bg-chart-2/12 text-chart-2" },
  "purchase-order": { icon: ShoppingCartIcon, className: "bg-chart-3/12 text-chart-3" },
  "add-product": { icon: PackageIcon, className: "bg-chart-5/12 text-chart-5" },
};

type QuickActionsPanelProps = {
  actions: QuickAction[];
  isLoading?: boolean;
  compact?: boolean;
};

export const QuickActionsPanel = memo(function QuickActionsPanel({
  actions,
  isLoading,
  compact = false,
}: QuickActionsPanelProps) {
  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-token-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const visibleActions = compact ? actions.slice(0, 4) : actions;

  return (
    <Card className="border-border/60 shadow-token-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">Quick Actions</CardTitle>
        <p className="text-sm text-muted-foreground">Launch common workflows</p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {visibleActions.map((action) => {
          const config = actionConfig[action.id] ?? {
            icon: PlusIcon,
            className: "bg-primary/12 text-primary",
          };
          const Icon = config.icon;

          return (
            <Link
              key={action.id}
              href={action.href}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-accent/40 hover:shadow-token-xs"
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                  config.className,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
});
