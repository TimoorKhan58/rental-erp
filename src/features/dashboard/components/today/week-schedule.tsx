"use client";

import Link from "next/link";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import type { DashboardScheduleEntry } from "../../types";

const DAYS = 7;

function addDays(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayLabel(isoDay: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDay}T00:00:00Z`),
  );
}

/** What goes out and comes back in the next 7 days (usability revamp R2). */
export function WeekSchedule({ today, entries }: { today: string; entries: DashboardScheduleEntry[] }) {
  const days = Array.from({ length: DAYS }, (_, index) => addDays(today, index));

  return (
    <section aria-labelledby="week-heading" className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="week-heading" className="text-sm font-semibold text-foreground">
          Next 7 days
        </h2>
        <Link href={ROUTES.rentalOrdersCalendar} className="text-xs font-medium text-primary hover:underline">
          Open calendar
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          Nothing is going out or coming back in the next 7 days.
        </p>
      ) : (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {days.map((day, index) => {
            const dayEntries = entries.filter((entry) => entry.date === day);
            return (
              <li key={day} className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-2.5 shadow-soft">
                <span className={cn("text-xs font-semibold", index === 0 ? "text-foreground" : "text-muted-foreground")}>
                  {dayLabel(day, index)}
                </span>
                {dayEntries.length === 0 ? (
                  <span className="text-xs text-muted-foreground/70">—</span>
                ) : (
                  dayEntries.map((entry) => (
                    <Link
                      key={`${entry.direction}-${entry.orderId}`}
                      href={ROUTES.rentalOrderDetail(entry.orderId)}
                      title={`${entry.direction === "out" ? "Goes out" : "Comes back"}: ${entry.orderNumber} · ${entry.customerName}`}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-xs font-medium hover:underline",
                        entry.direction === "out" ? "bg-info-muted text-info" : "bg-success-muted text-success",
                      )}
                    >
                      {entry.direction === "out" ? "Out" : "Back"}: {entry.customerName}
                    </Link>
                  ))
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-info">Out</span>: going to a customer ·{" "}
        <span className="font-medium text-success">Back</span>: due to come back. Each one opens the order.
      </p>
    </section>
  );
}
