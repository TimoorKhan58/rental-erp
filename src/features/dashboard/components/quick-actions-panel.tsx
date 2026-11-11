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
  "new-customer": { icon: UserPlusIcon, className: "bg-muted text-muted-foreground" },
  "new-rental": { icon: FileTextIcon, className: "bg-primary/10 text-primary" },
  "new-invoice": { icon: FileTextIcon, className: "bg-muted text-muted-foreground" },
  "receive-payment": { icon: CreditCardIcon, className: "bg-success-muted text-success" },
  "purchase-order": { icon: ShoppingCartIcon, className: "bg-muted text-muted-foreground" },
  "add-product": { icon: PackageIcon, className: "bg-muted text-muted-foreground" },
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
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const visibleActions = compact ? actions.slice(0, 4) : actions;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">Quick actions</CardTitle>
        <p className="text-sm text-muted-foreground">Common next steps</p>
      </CardHeader>
      <CardContent className="grid gap-1.5">
        {visibleActions.map((action) => {
          const config = actionConfig[action.id] ?? {
            icon: PlusIcon,
            className: "bg-primary/10 text-primary",
          };
          const Icon = config.icon;

          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
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
