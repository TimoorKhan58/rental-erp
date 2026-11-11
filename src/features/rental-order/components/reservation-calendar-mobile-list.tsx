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

type ReservationCalendarMobileListProps = {
  days: Date[];
  events: CalendarOrderEvent[];
};

export function ReservationCalendarMobileList({
  days,
  events,
}: ReservationCalendarMobileListProps) {
  return (
    <ol className="space-y-3 md:hidden" aria-label="Reservation agenda">
      {days.map((day) => {
        const dayEvents = eventsOverlappingDay(events, day);
        const today = isToday(day);

        return (
          <li
            key={day.toISOString()}
            className={cn(
              "rounded-md border border-border bg-card px-3 py-3",
              today && "border-primary/40",
            )}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className={cn("text-sm font-medium", today && "text-primary")}>
                {format(day, "EEE d MMM")}
                {today ? " · Today" : ""}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {dayEvents.length} reservation{dayEvents.length === 1 ? "" : "s"}
              </span>
            </div>

            {dayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No reservations</p>
            ) : (
              <ul className="space-y-1.5">
                {dayEvents.map((event) => (
                  <li key={`${event.id}-${day.toISOString()}`}>
                    <Link
                      href={ROUTES.rentalOrderDetail(event.id)}
                      className={cn(
                        "block rounded-md border-l-2 px-2 py-1.5",
                        STATUS_EVENT_CLASS[event.status],
                      )}
                    >
                      <p className="truncate text-xs font-semibold">{event.orderNumber}</p>
                      <p className="truncate text-[11px] opacity-80">{event.customerLabel}</p>
                      <p className="text-[10px] font-medium opacity-80">
                        {STATUS_LABELS[event.status]}
                        {" · "}
                        {format(event.start, "d MMM")} – {format(event.end, "d MMM")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
