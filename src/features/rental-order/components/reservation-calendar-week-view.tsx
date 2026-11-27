"use client";

import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "../mappers";
import {
  isToday,
  STATUS_EVENT_CLASS,
  type CalendarOrderEvent,
} from "../utils/reservation-calendar.utils";

type ReservationCalendarWeekViewProps = {
  days: Date[];
  events: CalendarOrderEvent[];
};

/**
 * Grid columns (1-based, after the order column) that an order covers
 * in this week, clipped to the week. Null when it is outside the week.
 */
export function weekBarColumns(
  event: Pick<CalendarOrderEvent, "start" | "end">,
  days: Date[],
): { from: number; to: number } | null {
  if (days.length === 0) return null;
  const first = days[0]!;
  const last = days[days.length - 1]!;
  if (event.end < first || event.start > last) return null;
  const from = Math.max(0, differenceInCalendarDays(event.start, first));
  const to = Math.min(days.length - 1, differenceInCalendarDays(event.end, first));
  return { from, to };
}

/**
 * Week as a timeline (UI redesign): one row per order, a bar across the
 * days it is out. Easier to see clashes than seven separate columns.
 */
export function ReservationCalendarWeekView({ days, events }: ReservationCalendarWeekViewProps) {
  const rows = events
    .map((event) => ({ event, cols: weekBarColumns(event, days) }))
    .filter((row): row is { event: CalendarOrderEvent; cols: { from: number; to: number } } => row.cols !== null)
    .sort((a, b) => a.cols.from - b.cols.from || a.event.orderNumber.localeCompare(b.event.orderNumber));

  const gridTemplate = { gridTemplateColumns: `13rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[56rem]" role="table" aria-label="Orders this week">
        <div role="row" className="grid border-b border-border bg-muted/40" style={gridTemplate}>
          <span role="columnheader" className="px-4 py-2 text-xs font-semibold text-muted-foreground">
            Order
          </span>
          {days.map((day) => (
            <span
              role="columnheader"
              key={day.toISOString()}
              className={cn(
                "border-l border-border px-2 py-2 text-xs font-semibold",
                isToday(day) ? "bg-primary/5 text-foreground" : "text-muted-foreground",
              )}
            >
              {format(day, "EEE d")}
              {isToday(day) ? " · Today" : ""}
            </span>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No orders out this week.</p>
        ) : (
          rows.map(({ event, cols }) => (
            <div
              role="row"
              key={event.id}
              className="grid min-h-12 items-center border-b border-border last:border-b-0"
              style={gridTemplate}
            >
              <Link
                role="cell"
                href={ROUTES.rentalOrderDetail(event.id)}
                className="min-w-0 px-4 py-2 hover:underline"
              >
                <span className="block truncate text-sm font-medium text-foreground">{event.customerLabel}</span>
                <span className="block text-xs text-muted-foreground">{event.orderNumber}</span>
              </Link>
              <Link
                role="cell"
                href={ROUTES.rentalOrderDetail(event.id)}
                title={`${event.orderNumber} · ${STATUS_LABELS[event.status]} · ${format(event.start, "d MMM")} – ${format(event.end, "d MMM")}`}
                style={{ gridColumn: `${cols.from + 2} / ${cols.to + 3}`, gridRow: 1 }}
                className={cn(
                  "mx-1 my-2 truncate rounded-md border-l-2 px-2 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90",
                  STATUS_EVENT_CLASS[event.status],
                )}
              >
                {STATUS_LABELS[event.status]} · {format(event.start, "d MMM")} – {format(event.end, "d MMM")}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
