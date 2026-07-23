"use client";

import Link from "next/link";
import { memo } from "react";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  InfoIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "../types";

const severityStyle = {
  critical: {
    icon: AlertTriangleIcon,
    badge: "bg-destructive/10 text-destructive",
    border: "border-destructive/25 hover:border-destructive/40",
    label: "Urgent",
  },
  warning: {
    icon: AlertTriangleIcon,
    badge: "bg-warning-muted text-warning-foreground",
    border: "border-warning/30 hover:border-warning/50",
    label: "Action",
  },
  info: {
    icon: InfoIcon,
    badge: "bg-info-muted text-info",
    border: "border-border/60 hover:border-primary/30",
    label: "Watch",
  },
} as const;

type AttentionNeededProps = {
  items: AttentionItem[];
  headline: string;
  isLoading?: boolean;
};

export const AttentionNeeded = memo(function AttentionNeeded({
  items,
  headline,
  isLoading,
}: AttentionNeededProps) {
  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-success/25 bg-success-muted/20 shadow-soft">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-muted text-success">
            <CheckCircle2Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="font-heading text-base font-semibold">All clear</p>
            <p className="text-sm text-muted-foreground">{headline}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">Needs attention now</CardTitle>
        <p className="text-sm text-muted-foreground">{headline}</p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => {
          const style = severityStyle[item.severity];
          const Icon = style.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-xl border bg-card px-3 py-3 transition-all hover:bg-accent/30 hover:shadow-token-xs",
                style.border,
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                  style.badge,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                      style.badge,
                    )}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <span className="mt-1 flex shrink-0 items-center gap-1 text-xs font-medium text-primary opacity-80 group-hover:opacity-100">
                {item.cta}
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
});
