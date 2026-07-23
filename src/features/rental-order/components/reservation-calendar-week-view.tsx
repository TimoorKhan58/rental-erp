"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "../mappers";
import {
  eventsOverlappingDay,
  isToday,
  STATUS_EVENT_CLASS,
  type CalendarOrderEvent,
} from "../utils/reservation-calendar.utils";

type ReservationCalendarWeekViewProps = {
  days: Date[];
  events: CalendarOrderEvent[];
};

export function ReservationCalendarWeekView({
  days,
  events,
}: ReservationCalendarWeekViewProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="grid grid-cols-1 divide-y sm:grid-cols-7 sm:divide-x sm:divide-y-0">
        {days.map((day) => {
          const dayEvents = eventsOverlappingDay(events, day);
          const today = isToday(day);

          return (
            <div key={day.toISOString()} className="min-h-64 bg-background">
              <div
                className={cn(
                  "flex items-center justify-between border-b px-3 py-2",
                  today && "bg-primary/5",
                )}
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-semibold leading-none",
                      today && "text-primary",
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {dayEvents.length}
                </span>
              </div>

              <div className="space-y-1.5 p-2">
                {dayEvents.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    No reservations
                  </p>
                ) : (
                  dayEvents.map((event) => (
                    <Link
                      key={`${event.id}-${day.toISOString()}`}
                      href={ROUTES.rentalOrderDetail(event.id)}
                      className={cn(
                        "block rounded-md border-l-2 px-2 py-1.5 transition-opacity hover:opacity-90",
                        STATUS_EVENT_CLASS[event.status],
                      )}
                    >
                      <p className="truncate text-xs font-semibold">
                        {event.orderNumber}
                      </p>
                      <p className="truncate text-[11px] opacity-80">
                        {event.customerLabel}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium opacity-80">
                        {STATUS_LABELS[event.status]}
                        {" · "}
                        {format(event.start, "d MMM")} – {format(event.end, "d MMM")}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
