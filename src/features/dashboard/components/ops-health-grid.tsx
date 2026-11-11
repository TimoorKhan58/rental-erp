"use client";

import Link from "next/link";
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OpsHealthItem } from "../types";

const toneBorder: Record<OpsHealthItem["tone"], string> = {
  ok: "border-border",
  neutral: "border-border",
  warning: "border-warning/40",
  critical: "border-destructive/35",
};

const toneValue: Record<OpsHealthItem["tone"], string> = {
  ok: "text-foreground",
  neutral: "text-foreground",
  warning: "text-warning-foreground",
  critical: "text-destructive",
};

const toneDot: Record<OpsHealthItem["tone"], string> = {
  ok: "bg-success",
  neutral: "bg-muted-foreground/40",
  warning: "bg-warning",
  critical: "bg-destructive",
};

type OpsHealthGridProps = {
  items: OpsHealthItem[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  columns?: "today" | "inventory" | "upcoming" | "default";
  emptyLabel?: string;
};

function gridClass(columns: OpsHealthGridProps["columns"]): string {
  switch (columns) {
    case "today":
      return "app-grid [&>*]:sm:col-span-3 [&>*]:lg:col-span-3";
    case "inventory":
      return "app-grid [&>*]:sm:col-span-2 [&>*]:lg:col-span-4";
    case "upcoming":
      return "app-grid [&>*]:sm:col-span-2 [&>*]:lg:col-span-4";
    default:
      return "app-grid [&>*]:sm:col-span-3 [&>*]:lg:col-span-4";
  }
}

function skeletonCount(columns: OpsHealthGridProps["columns"]): number {
  switch (columns) {
    case "today":
      return 4;
    case "inventory":
    case "upcoming":
      return 3;
    default:
      return 6;
  }
}

/**
 * Reusable operational metric strip — border-first, tone-aware, linkable.
 */
export const OpsHealthGrid = memo(function OpsHealthGrid({
  items,
  isLoading,
  title = "Operations",
  description,
  columns = "default",
  emptyLabel = "No operational signals",
}: OpsHealthGridProps) {
  if (isLoading) {
    return (
      <section aria-busy="true" aria-label={`Loading ${title}`}>
        <div className="mb-3 space-y-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className={gridClass(columns)}>
          {Array.from({ length: skeletonCount(columns) }).map((_, index) => (
            <Card key={index} size="sm" className="gap-0 border-border py-0">
              <CardContent className="space-y-1 p-3">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={title}>
      <div className="mb-2">
        <h2 className="font-heading text-[length:var(--text-small)] font-semibold tracking-[0.06em] text-foreground uppercase">
          {title}
        </h2>
        {description ? (
          <p className="text-[length:var(--text-caption)] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className={gridClass(columns)}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card
                size="sm"
                className={cn(
                  "h-full gap-0 border bg-card py-0 transition-colors hover:bg-muted/30",
                  toneBorder[item.tone],
                )}
              >
                <CardContent className="space-y-0.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "font-heading text-2xl font-semibold leading-none tracking-tight tabular-nums",
                        toneValue[item.tone],
                      )}
                    >
                      {item.value}
                    </p>
                    <span
                      className={cn("size-2 shrink-0 rounded-full", toneDot[item.tone])}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {item.label}
                  </p>
                  <p className="text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                    {item.hint}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
});
