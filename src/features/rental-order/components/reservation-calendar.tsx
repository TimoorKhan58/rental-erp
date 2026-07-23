"use client";

import { useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { formatISO } from "date-fns";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, QueryErrorState } from "@/components/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRentalOrderFilterOptions, useRentalOrders } from "../hooks";
import {
  formatRangeLabel,
  getRangeDays,
  getVisibleRange,
  eventsOverlappingRange,
  shiftAnchor,
  toCalendarEvents,
  type CalendarViewMode,
} from "../utils/reservation-calendar.utils";
import { ReservationCalendarMonthView } from "./reservation-calendar-month-view";
import { ReservationCalendarWeekView } from "./reservation-calendar-week-view";

export function ReservationCalendar() {
  const [view, setView] = useState<CalendarViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());

  const range = useMemo(() => getVisibleRange(anchor, view), [anchor, view]);
  const eventFrom = formatISO(range.start, { representation: "date" });
  const eventTo = formatISO(range.end, { representation: "date" });

  const listQuery = useRentalOrders({
    pageSize: 100,
    sortBy: "eventStartDate",
    sortOrder: "asc",
    eventFrom,
    eventTo,
  });
  const { customerNameById } = useRentalOrderFilterOptions();

  const events = useMemo(() => {
    if (!listQuery.data) {
      return [];
    }
    return toCalendarEvents(listQuery.data.items, customerNameById);
  }, [listQuery.data, customerNameById]);

  const days = useMemo(() => getRangeDays(anchor, view), [anchor, view]);
  const visibleEvents = useMemo(
    () => eventsOverlappingRange(events, range.start, range.end),
    [events, range.start, range.end],
  );

  if (listQuery.isLoading) {
    return <LoadingState label="Loading reservation calendar..." />;
  }

  if (listQuery.isError) {
    return (
      <QueryErrorState
        title="Could not load calendar"
        description="Failed to load rental orders for the reservation calendar."
        onRetry={() => void listQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value === "week" || value === "month") {
            setView(value);
          }
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <TabsList aria-label="Calendar view">
              <TabsTrigger value="week">Weekly</TabsTrigger>
              <TabsTrigger value="month">Monthly</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1">
              <AppButton
                variant="outline"
                size="icon-sm"
                aria-label={`Previous ${view}`}
                onClick={() => setAnchor((current) => shiftAnchor(current, view, -1))}
              >
                <ChevronLeftIcon className="size-4" />
              </AppButton>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setAnchor(new Date())}
              >
                Today
              </AppButton>
              <AppButton
                variant="outline"
                size="icon-sm"
                aria-label={`Next ${view}`}
                onClick={() => setAnchor((current) => shiftAnchor(current, view, 1))}
              >
                <ChevronRightIcon className="size-4" />
              </AppButton>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <CalendarDaysIcon
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="font-medium">{formatRangeLabel(anchor, view)}</span>
            <span className="text-muted-foreground">
              · {visibleEvents.length} reservation
              {visibleEvents.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <TabsContent value="week" className="mt-4">
          <ReservationCalendarWeekView days={days} events={visibleEvents} />
        </TabsContent>

        <TabsContent value="month" className="mt-4">
          <ReservationCalendarMonthView
            days={days}
            anchor={anchor}
            events={visibleEvents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
