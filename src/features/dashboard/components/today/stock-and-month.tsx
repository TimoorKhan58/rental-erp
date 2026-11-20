"use client";

import Link from "next/link";

import { ROUTES } from "@/config/routes";
import { countLabel, formatCurrency, formatNumber } from "@/lib/utils";

import type { LiveDashboardSummary } from "../../types";

function Tile({ label, value, note, href }: { label: string; value: string; note: string; href?: string }) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </>
  );
  const className = "flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3.5 shadow-soft";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:border-primary/50`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** What stock is free right now (usability revamp R2). */
export function StockNow({ summary }: { summary: LiveDashboardSummary }) {
  const free = summary.availableQuantity;
  const booked = summary.reservedQuantity;
  const total = Math.max(free + booked, 1);
  const repairs = summary.repairsPending + summary.repairsInProgress;

  return (
    <section aria-labelledby="stock-heading" className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="stock-heading" className="text-sm font-semibold text-foreground">
          Stock right now
        </h2>
        <Link href={ROUTES.inventory} className="text-xs font-medium text-primary hover:underline">
          Open inventory
        </Link>
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="h-full bg-success" style={{ width: `${(free / total) * 100}%` }} />
          <span className="h-full bg-info" style={{ width: `${(booked / total) * 100}%` }} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Free to rent</dt>
            <dd className="font-semibold tabular-nums text-success">{formatNumber(free)} items</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Booked for upcoming orders</dt>
            <dd className="font-semibold tabular-nums text-info">{formatNumber(booked)} items</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Out with customers</dt>
            <dd className="font-semibold tabular-nums text-foreground">
              {countLabel(summary.worklist.ordersOutWithCustomers, "order")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">In repair</dt>
            <dd className="font-semibold tabular-nums text-foreground">{countLabel(repairs, "job")}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">&ldquo;Free to rent&rdquo; already leaves out what is booked.</p>
      </div>
    </section>
  );
}

/** This month's money and orders, in plain words (usability revamp R2). */
export function MonthSoFar({ summary }: { summary: LiveDashboardSummary }) {
  const active = summary.confirmedOrders + summary.reservedOrders + summary.worklist.ordersOutWithCustomers;
  // Workers don't see money: the server leaves it out and sets moneyHidden.
  if (summary.moneyHidden) {
    return null;
  }
  return (
    <section aria-labelledby="month-heading" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="month-heading" className="text-sm font-semibold text-foreground">
          This month so far
        </h2>
        <Link href={ROUTES.reportsAnalytics} className="text-xs font-medium text-primary hover:underline">
          See full reports
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile
          label="Billed"
          value={formatCurrency(summary.revenueThisMonth)}
          note="Invoices issued this month"
          href={ROUTES.rentalInvoices}
        />
        <Tile
          label="Collected"
          value={formatCurrency(summary.paymentsThisMonth)}
          note="Payments received this month"
          href={ROUTES.payments}
        />
        <Tile
          label="Still to collect"
          value={formatCurrency(summary.worklist.amountToCollect)}
          note={`From ${countLabel(summary.worklist.unpaidInvoices, "unpaid invoice")}`}
          href={ROUTES.rentalInvoices}
        />
        <Tile
          label="Orders"
          value={`${formatNumber(active)} active`}
          note={`${formatNumber(summary.completedRentals)} completed in total`}
          href={ROUTES.rentalOrders}
        />
      </div>
    </section>
  );
}
