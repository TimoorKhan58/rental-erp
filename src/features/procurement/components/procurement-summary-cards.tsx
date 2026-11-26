"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardListIcon, ClockIcon, WalletIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import { queryKeys } from "@/lib/query";
import { cn, formatCurrency } from "@/lib/utils";
import { getProcurements } from "../services";

/**
 * The three things people ask first about buying: how many orders are still
 * open, how many are on their way, and how much is owed to suppliers.
 * Summed from the list (purchase orders are few), so it needs no new API.
 */
export function ProcurementSummaryCards({ className }: { className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.procurement.list({ all: true, summary: true }),
    queryFn: () => fetchAllPages(getProcurements, {}),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className={cn("grid gap-3 sm:grid-cols-3", className)} aria-busy="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-border shadow-soft">
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const orders = (data?.items ?? []).filter((order) => order.status !== "CANCELLED");
  const open = orders.filter((order) => order.status === "DRAFT" || order.status === "APPROVED");
  const partly = orders.filter((order) => order.status === "PARTIALLY_RECEIVED");
  const owed = orders.reduce((sum, order) => sum + Math.max(order.balance, 0), 0);
  const owedTo = new Set(orders.filter((order) => order.balance > 0).map((order) => order.supplierId)).size;

  const cards = [
    {
      label: "Waiting to arrive",
      value: String(open.length + partly.length),
      hint: partly.length > 0 ? `${partly.length} partly received` : "Not received yet",
      icon: ClockIcon,
      iconClass: "bg-info/12 text-info",
    },
    {
      label: "Owed to suppliers",
      value: formatCurrency(owed),
      hint: owed > 0 ? `To ${owedTo} supplier${owedTo === 1 ? "" : "s"}` : "Nothing owed",
      icon: WalletIcon,
      iconClass: "bg-warning-muted text-warning-foreground",
      accent: owed > 0,
    },
    {
      label: "All purchases",
      value: String(orders.length),
      hint: "Not counting cancelled",
      icon: ClipboardListIcon,
      iconClass: "bg-primary/10 text-primary",
    },
  ];

  return (
    <section aria-label="Purchases summary" className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {cards.map((card) => (
        <Card
          key={card.label}
          className={cn("border-border shadow-soft", card.accent && "border-warning/30")}
        >
          <CardContent className="flex items-start gap-3 p-4">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", card.iconClass)}>
              <card.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums tracking-tight">{card.value}</p>
              <p className="text-sm font-medium">{card.label}</p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
