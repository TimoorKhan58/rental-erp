"use client";

import Link from "next/link";
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OpsHealthItem } from "../types";

const toneClass: Record<OpsHealthItem["tone"], string> = {
  ok: "border-success/20",
  neutral: "border-border/60",
  warning: "border-warning/35",
  critical: "border-destructive/30",
};

const valueClass: Record<OpsHealthItem["tone"], string> = {
  ok: "text-foreground",
  neutral: "text-foreground",
  warning: "text-warning-foreground",
  critical: "text-destructive",
};

type OpsHealthGridProps = {
  items: OpsHealthItem[];
  isLoading?: boolean;
};

export const OpsHealthGrid = memo(function OpsHealthGrid({
  items,
  isLoading,
}: OpsHealthGridProps) {
  if (isLoading) {
    return (
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        aria-busy="true"
        aria-label="Loading operations health"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border-border/60">
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Operations health">
      <div className="mb-3">
        <h2 className="font-heading text-sm font-semibold tracking-wide text-foreground uppercase">
          Field & stock health
        </h2>
        <p className="text-xs text-muted-foreground">
          Deliveries, returns, and gear availability
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="block focus-visible:outline-none">
            <Card
              className={cn(
                "h-full border bg-card shadow-soft transition-all duration-200 hover:shadow-soft-md",
                toneClass[item.tone],
              )}
            >
              <CardContent className="space-y-1 p-4">
                <p
                  className={cn(
                    "font-heading text-2xl font-semibold tracking-tight tabular-nums",
                    valueClass[item.tone],
                  )}
                >
                  {item.value}
                </p>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
});
