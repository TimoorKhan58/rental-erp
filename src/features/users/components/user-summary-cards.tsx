"use client";

import { UserCogIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type UserSummaryCardsProps = {
  /** Total matching the current list query (from list meta). */
  total: number;
  isLoading?: boolean;
};

/**
 * Simplified until a dedicated identity statistics endpoint exists.
 * Uses the list response `meta.total` — no extra API requests.
 */
export function UserSummaryCards({ total, isLoading }: UserSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="border-border/60 shadow-token-sm sm:col-span-1">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <UserCogIcon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">Matching users</p>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="font-heading text-2xl font-semibold tracking-tight">
                {total.toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
