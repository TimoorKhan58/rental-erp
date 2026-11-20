"use client";

import Link from "next/link";

import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { countLabel, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

import type { LiveDashboardSummary } from "../../types";

type Tone = "urgent" | "attention" | "calm";

type WorkItem = {
  id: string;
  count: number;
  tone: Tone;
  title: string;
  detail: string;
  action: string;
  href: string;
};

// Calm style: no heavy coloured bars. A soft round badge carries the count and
// the tone; finished ("calm") rows fade back so the eye goes to what needs doing.
const TONE: Record<Tone, { row: string; count: string }> = {
  urgent: { row: "", count: "bg-error-muted text-destructive" },
  attention: { row: "", count: "bg-warning-muted text-warning-foreground" },
  calm: { row: "opacity-80", count: "bg-success-muted text-success" },
};

/** What needs doing, most urgent first, each with one button (usability revamp R2). */
export function buildWorkItems(summary: LiveDashboardSummary): WorkItem[] {
  const work = summary.worklist;
  const repairs = summary.repairsPending + summary.repairsInProgress;
  const items: WorkItem[] = [];

  if (work.lateReturns > 0) {
    items.push({
      id: "late",
      count: work.lateReturns,
      tone: "urgent",
      title: `${countLabel(work.lateReturns, "order")} late coming back`,
      detail: "Their return date has passed. Call the customer or receive the items.",
      action: "See returns",
      href: ROUTES.returns,
    });
  }

  if (!summary.moneyHidden) items.push({
    id: "invoices",
    count: work.unpaidInvoices,
    tone: work.overdueInvoices > 0 ? "urgent" : work.unpaidInvoices > 0 ? "attention" : "calm",
    title:
      work.unpaidInvoices > 0
        ? `${countLabel(work.unpaidInvoices, "unpaid invoice")}: ${formatCurrency(work.amountToCollect)} to collect`
        : "All invoices are paid",
    detail:
      work.oldestOverdueDays !== null
        ? `${countLabel(work.overdueInvoices, "invoice")} past the due date; the oldest by ${countLabel(work.oldestOverdueDays, "day")}.`
        : work.unpaidInvoices > 0
          ? "None is past its due date yet."
          : "Nothing to collect right now.",
    action: "Collect",
    href: ROUTES.rentalInvoices,
  });

  items.push({
    id: "returns",
    count: summary.pendingReturns,
    tone: summary.pendingReturns > 0 ? "attention" : "calm",
    title: summary.pendingReturns > 0 ? `${countLabel(summary.pendingReturns, "return")} waiting to be checked` : "No returns waiting",
    detail:
      summary.pendingReturns > 0
        ? "Returned items can't be rented again until they are checked."
        : "Everything that came back has been checked.",
    action: "Check returns",
    href: ROUTES.returns,
  });

  items.push({
    id: "repairs",
    count: repairs,
    tone: repairs > 0 ? "attention" : "calm",
    title: repairs > 0 ? `${countLabel(repairs, "repair job")} open` : "No repairs open",
    detail: repairs > 0 ? "Items in repair can't go out on a booking." : "All items are in working order.",
    action: "Open repairs",
    href: ROUTES.repairs,
  });

  items.push({
    id: "out-today",
    count: work.ordersGoingOutToday,
    tone: work.ordersGoingOutToday > 0 ? "attention" : "calm",
    title:
      work.ordersGoingOutToday > 0
        ? `${countLabel(work.ordersGoingOutToday, "order")} to send out today`
        : "Nothing to send out today",
    detail:
      work.ordersGoingOutToday > 0 ? "Prepare the items and create the dispatch." : "No booking starts today.",
    action: "See dispatches",
    href: ROUTES.dispatches,
  });

  return items;
}

export function TodayWorklist({ summary }: { summary: LiveDashboardSummary }) {
  const items = buildWorkItems(summary);
  return (
    <section aria-labelledby="today-work-heading" className="space-y-2">
      <h2 id="today-work-heading" className="text-sm font-semibold text-foreground">
        Your work today
      </h2>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "grid grid-cols-[2.5rem_1fr] items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-soft sm:grid-cols-[2.5rem_1fr_auto]",
              TONE[item.tone].row,
            )}
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-lg font-semibold tabular-nums",
                TONE[item.tone].count,
              )}
            >
              {item.count}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <AppButton
              size="sm"
              variant={item.tone === "calm" ? "ghost" : "outline"}
              className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-end"
              render={<Link href={item.href} />}
            >
              {item.action}
            </AppButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
