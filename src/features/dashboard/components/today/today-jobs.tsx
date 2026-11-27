"use client";

import Link from "next/link";

import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { countLabel, formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

import type { DashboardScheduleEntry, LiveDashboardSummary } from "../../types";

/** Orders that go out or come back today, going out first. */
export function todaysJobs(summary: LiveDashboardSummary): DashboardScheduleEntry[] {
  const today = summary.worklist.today;
  return summary.worklist.schedule
    .filter((entry) => entry.date === today)
    .sort((a, b) => (a.direction === b.direction ? 0 : a.direction === "out" ? -1 : 1));
}

function Tile({
  label,
  value,
  note,
  dot,
  href,
}: {
  label: string;
  value: string;
  note: string;
  dot: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3.5 shadow-soft transition-colors hover:border-primary/50"
    >
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn("size-2 rounded-full", dot)} aria-hidden="true" />
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </Link>
  );
}

/**
 * Four numbers at the top of Home (UI redesign). People who can't see
 * money get orders out and late returns instead of the money tiles.
 */
export function TodayNumbers({ summary }: { summary: LiveDashboardSummary }) {
  const jobs = todaysJobs(summary);
  const out = jobs.filter((job) => job.direction === "out").length;
  const back = jobs.length - out;
  const work = summary.worklist;

  return (
    <section aria-label="Today in numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Going out today"
        value={countLabel(out, "order")}
        note={out > 0 ? "Load and send these" : "Nothing to send today"}
        dot="bg-info"
        href={ROUTES.dispatches}
      />
      <Tile
        label="Coming back today"
        value={countLabel(back, "order")}
        note={work.lateReturns > 0 ? `${countLabel(work.lateReturns, "order")} already late` : "None late"}
        dot="bg-success"
        href={ROUTES.returns}
      />
      {summary.moneyHidden ? (
        <>
          <Tile
            label="With customers now"
            value={countLabel(work.ordersOutWithCustomers, "order")}
            note="Out on rent today"
            dot="bg-primary"
            href={ROUTES.rentalOrders}
          />
          <Tile
            label="Waiting to be checked"
            value={countLabel(summary.pendingReturns, "return")}
            note="Check before renting again"
            dot="bg-warning"
            href={ROUTES.returns}
          />
        </>
      ) : (
        <>
          <Tile
            label="Collected this month"
            value={formatCurrency(summary.paymentsThisMonth)}
            note={`Billed ${formatCurrency(summary.revenueThisMonth)}`}
            dot="bg-primary"
            href={ROUTES.payments}
          />
          <Tile
            label="Still to collect"
            value={formatCurrency(work.amountToCollect)}
            note={
              work.overdueInvoices > 0
                ? `${countLabel(work.overdueInvoices, "invoice")} past due`
                : `From ${countLabel(work.unpaidInvoices, "unpaid invoice")}`
            }
            dot="bg-warning"
            href={ROUTES.rentalInvoices}
          />
        </>
      )}
    </section>
  );
}

/**
 * Each order going out or coming back today, with one button for the next
 * step (UI redesign). The row opens the order; the button does the step.
 */
export function TodayJobs({ summary }: { summary: LiveDashboardSummary }) {
  const jobs = todaysJobs(summary);

  return (
    <section
      aria-labelledby="today-jobs-heading"
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-soft"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="today-jobs-heading" className="text-sm font-semibold text-foreground">
          Today&apos;s jobs
        </h2>
        <Link href={ROUTES.rentalOrders} className="text-xs font-medium text-primary hover:underline">
          All orders
        </Link>
      </div>
      {jobs.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nothing goes out or comes back today. The next 7 days are below.
        </p>
      ) : (
        <ul>
          {jobs.map((job) => {
            const out = job.direction === "out";
            const stepHref = `${out ? ROUTES.dispatchesNew : ROUTES.returnsNew}?rentalOrderId=${job.orderId}`;
            return (
              <li
                key={`${job.direction}-${job.orderId}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span
                  className={cn(
                    "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
                    out ? "bg-info-muted text-info" : "bg-success-muted text-success",
                  )}
                >
                  {out ? "Send out" : "Receive back"}
                </span>
                <Link
                  href={ROUTES.rentalOrderDetail(job.orderId)}
                  className="min-w-0 flex-1 basis-48 hover:underline"
                >
                  <span className="block truncate text-sm font-medium text-foreground">{job.customerName}</span>
                  <span className="block text-xs text-muted-foreground">{job.orderNumber}</span>
                </Link>
                <AppButton size="sm" variant={out ? "default" : "outline"} render={<Link href={stepHref} />}>
                  {out ? "Send out" : "Receive back"}
                </AppButton>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** "Good morning. 3 jobs today." */
export function jobsHeadline(summary: LiveDashboardSummary): string {
  const count = todaysJobs(summary).length;
  return count === 0 ? "No jobs today." : `${formatNumber(count)} ${count === 1 ? "job" : "jobs"} today.`;
}
