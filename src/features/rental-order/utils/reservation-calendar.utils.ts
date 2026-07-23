import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { RentalOrderResponse, RentalOrderStatus } from "../types";

export type CalendarViewMode = "week" | "month";

export type CalendarOrderEvent = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerLabel: string;
  status: RentalOrderStatus;
  start: Date;
  end: Date;
};

const HIDDEN_STATUSES: RentalOrderStatus[] = ["CANCELLED"];

export function parseOrderDate(value: string): Date {
  return startOfDay(parseISO(value));
}

export function toCalendarEvents(
  orders: RentalOrderResponse[],
  customerNameById: Map<string, string>,
): CalendarOrderEvent[] {
  return orders
    .filter((order) => !HIDDEN_STATUSES.includes(order.status))
    .map((order) => {
      const start = parseOrderDate(order.startDate);
      const end = parseOrderDate(order.endDate);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerLabel: customerNameById.get(order.customerId) ?? "Customer",
        status: order.status,
        start,
        end: end < start ? start : end,
      };
    });
}

export function getVisibleRange(
  anchor: Date,
  view: CalendarViewMode,
): { start: Date; end: Date } {
  if (view === "week") {
    return {
      start: startOfWeek(anchor, { weekStartsOn: 1 }),
      end: endOfWeek(anchor, { weekStartsOn: 1 }),
    };
  }

  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  return {
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  };
}

export function getRangeDays(anchor: Date, view: CalendarViewMode): Date[] {
  const { start, end } = getVisibleRange(anchor, view);
  return eachDayOfInterval({ start, end });
}

export function eventsOverlappingDay(
  events: CalendarOrderEvent[],
  day: Date,
): CalendarOrderEvent[] {
  const dayStart = startOfDay(day);
  return events.filter((event) =>
    isWithinInterval(dayStart, { start: event.start, end: event.end }),
  );
}

export function eventsOverlappingRange(
  events: CalendarOrderEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarOrderEvent[] {
  return events.filter(
    (event) => event.start <= rangeEnd && event.end >= rangeStart,
  );
}

export function formatRangeLabel(anchor: Date, view: CalendarViewMode): string {
  if (view === "week") {
    const { start, end } = getVisibleRange(anchor, "week");
    if (isSameMonth(start, end)) {
      return `${format(start, "d")} – ${format(end, "d MMM yyyy")}`;
    }
    return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  }

  return format(anchor, "MMMM yyyy");
}

export function shiftAnchor(
  anchor: Date,
  view: CalendarViewMode,
  direction: -1 | 1,
): Date {
  if (view === "week") {
    return addDays(anchor, direction * 7);
  }
  return addMonths(anchor, direction);
}

export function isToday(day: Date): boolean {
  return isSameDay(day, new Date());
}

export const STATUS_EVENT_CLASS: Record<RentalOrderStatus, string> = {
  DRAFT: "border-l-muted-foreground/50 bg-muted text-muted-foreground",
  CONFIRMED: "border-l-sky-500 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  RESERVED: "border-l-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  DISPATCHED: "border-l-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  ON_RENT: "border-l-orange-500 bg-orange-500/10 text-orange-900 dark:text-orange-100",
  PARTIALLY_RETURNED:
    "border-l-violet-500 bg-violet-500/10 text-violet-900 dark:text-violet-100",
  RETURNED: "border-l-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-100",
  COMPLETED: "border-l-emerald-600 bg-emerald-600/10 text-emerald-950 dark:text-emerald-50",
  CANCELLED: "border-l-muted-foreground bg-muted text-muted-foreground line-through",
};
