"use client";

import Link from "next/link";
import { format, isSameMonth } from "date-fns";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "../mappers";
import {
  eventsOverlappingDay,
  isToday,
  STATUS_EVENT_CLASS,
  type CalendarOrderEvent,
} from "../utils/reservation-calendar.utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ReservationCalendarMonthViewProps = {
  days: Date[];
  anchor: Date;
  events: CalendarOrderEvent[];
};

export function ReservationCalendarMonthView({
  days,
  anchor,
  events,
}: ReservationCalendarMonthViewProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayEvents = eventsOverlappingDay(events, day);
          const inMonth = isSameMonth(day, anchor);
          const today = isToday(day);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-28 border-b border-r p-1.5 last:border-r-0",
                !inMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    {dayEvents.length}
                  </span>
                ) : null}
              </div>

              <div className="space-y-0.5">
                {visible.map((event) => (
                  <Link
                    key={`${event.id}-${day.toISOString()}`}
                    href={ROUTES.rentalOrderDetail(event.id)}
                    className={cn(
                      "block truncate rounded-sm border-l-2 px-1.5 py-0.5 text-[11px] leading-tight hover:opacity-90",
                      STATUS_EVENT_CLASS[event.status],
                    )}
                    title={`${event.orderNumber} · ${event.customerLabel} · ${STATUS_LABELS[event.status]}`}
                  >
                    <span className="font-medium">{event.orderNumber}</span>
                    <span className="opacity-80"> · {STATUS_LABELS[event.status]}</span>
                  </Link>
                ))}
                {overflow > 0 ? (
                  <p className="px-1 text-[10px] text-muted-foreground">
                    +{overflow} more
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
