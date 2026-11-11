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
  options?: { includeCancelled?: boolean },
): CalendarOrderEvent[] {
  const includeCancelled = options?.includeCancelled ?? false;

  return orders
    .filter((order) => includeCancelled || !HIDDEN_STATUSES.includes(order.status))
    .map((order) => {
      const start = parseOrderDate(order.startDate);
      const end = parseOrderDate(order.endDate);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerLabel: customerNameById.get(order.customerId) ?? "Unknown customer",
        status: order.status,
        start,
        end: end < start ? start : end,
      };
    });
}

export function parseCalendarDateParam(value: string | undefined): Date {
  if (!value) {
    return startOfDay(new Date());
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return startOfDay(new Date());
  }

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(parsed.getTime())) {
    return startOfDay(new Date());
  }

  return startOfDay(parsed);
}

export function formatCalendarDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
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
  CONFIRMED: "border-l-info bg-info-muted text-info",
  RESERVED: "border-l-success bg-success-muted text-success",
  DISPATCHED: "border-l-warning bg-warning-muted text-warning-foreground",
  ON_RENT: "border-l-warning bg-warning-muted text-warning-foreground",
  PARTIALLY_RETURNED: "border-l-info bg-info-muted text-info",
  RETURNED: "border-l-success bg-success-muted text-success",
  COMPLETED: "border-l-success bg-success-muted text-success",
  CANCELLED: "border-l-muted-foreground bg-muted text-muted-foreground line-through",
};
