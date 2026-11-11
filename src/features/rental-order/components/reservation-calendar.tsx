"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
} from "lucide-react";
import { formatISO } from "date-fns";
import { ActiveFilters } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { EmptyState } from "@/components/feedback";
import { LoadingState, QueryErrorState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/lib/query";
import { STATUS_LABELS } from "../mappers";
import {
  useRentalOrderFilterOptions,
  useRentalOrders,
  useReservationCalendarParams,
} from "../hooks";
import { RentalOrderStatusFilterChips } from "./rental-order-status-filter-chips";
import {
  eventsOverlappingDay,
  formatCalendarDateParam,
  parseCalendarDateParam,
  formatRangeLabel,
  getRangeDays,
  getVisibleRange,
  eventsOverlappingRange,
  isToday,
  toCalendarEvents,
  STATUS_EVENT_CLASS,
} from "../utils/reservation-calendar.utils";
import { RENTAL_ORDER_STATUSES } from "../types";
import { ReservationCalendarMonthView } from "./reservation-calendar-month-view";
import { ReservationCalendarMobileList } from "./reservation-calendar-mobile-list";
import { ReservationCalendarWeekView } from "./reservation-calendar-week-view";

export function ReservationCalendar() {
  const queryClient = useQueryClient();
  const {
    view,
    anchor,
    status,
    customerId,
    warehouseId,
    search,
    localSearch,
    setLocalSearch,
    setView,
    setAnchor,
    shiftPeriod,
    goToToday,
    setSearch,
    setStatus,
    setCustomerId,
    setWarehouseId,
    clearAllFilters,
  } = useReservationCalendarParams();

  const range = useMemo(() => getVisibleRange(anchor, view), [anchor, view]);
  const eventFrom = formatISO(range.start, { representation: "date" });
  const eventTo = formatISO(range.end, { representation: "date" });

  const listQuery = useRentalOrders(
    {
      pageSize: 100,
      sortBy: "eventStartDate",
      sortOrder: "asc",
      eventFrom,
      eventTo,
      status,
      customerId,
      warehouseId,
      search,
    },
    { keepPreviousData: true },
  );
  const { customerOptions, warehouseOptions, customerNameById, customerLabelById, warehouseLabelById } =
    useRentalOrderFilterOptions();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, search, setSearch]);

  const events = useMemo(() => {
    if (!listQuery.data) {
      return [];
    }
    return toCalendarEvents(listQuery.data.items, customerNameById, {
      includeCancelled: status === "CANCELLED",
    });
  }, [listQuery.data, customerNameById, status]);

  const days = useMemo(() => getRangeDays(anchor, view), [anchor, view]);
  const visibleEvents = useMemo(
    () => eventsOverlappingRange(events, range.start, range.end),
    [events, range.start, range.end],
  );
  const mobileDays = useMemo(() => {
    if (view === "week") {
      return days;
    }

    return days.filter(
      (day) => isToday(day) || eventsOverlappingDay(visibleEvents, day).length > 0,
    );
  }, [days, view, visibleEvents]);

  const hasFilters = Boolean(search || status || customerId || warehouseId);
  const totalMatching = listQuery.data?.meta.total ?? visibleEvents.length;
  const isTruncated = totalMatching > (listQuery.data?.items.length ?? 0);

  const activeFilters = [
    search
      ? {
          id: "search",
          label: `Search: ${search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    status
      ? {
          id: "status",
          label: `Status: ${STATUS_LABELS[status]}`,
          onClear: () => setStatus(undefined),
        }
      : null,
    customerId
      ? {
          id: "customer",
          label: `Customer: ${customerLabelById.get(customerId) ?? customerId}`,
          onClear: () => setCustomerId(undefined),
        }
      : null,
    warehouseId
      ? {
          id: "warehouse",
          label: `Warehouse: ${warehouseLabelById.get(warehouseId) ?? warehouseId}`,
          onClear: () => setWarehouseId(undefined),
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onClear: () => void }>;

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() });
    void listQuery.refetch();
  };

  if (listQuery.isError && !listQuery.data) {
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
      <RentalOrderStatusFilterChips
        value={status ?? "all"}
        onChange={(value) => setStatus(value === "all" ? undefined : value)}
      />
      <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search order number or notes..."
            className="w-full sm:max-w-xs"
            aria-label="Search reservations by order number or notes"
          />
          <Select
            value={customerId ?? "all"}
            onValueChange={(value) => {
              if (!value || value === "all") {
                setCustomerId(undefined);
                return;
              }
              setCustomerId(value);
            }}
          >
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by customer">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {customerOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={warehouseId ?? "all"}
            onValueChange={(value) => {
              if (!value || value === "all") {
                setWarehouseId(undefined);
                return;
              }
              setWarehouseId(value);
            }}
          >
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by warehouse">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouseOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={formatCalendarDateParam(anchor)}
            onChange={(event) => {
              if (!event.target.value) {
                return;
              }
              setAnchor(parseCalendarDateParam(event.target.value));
            }}
            className="w-full sm:w-40"
            aria-label="Jump to date"
          />
        </div>
        <AppButton
          variant="outline"
          size="sm"
          leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
          onClick={handleRefresh}
          loading={listQuery.isFetching && !listQuery.isLoading}
          aria-label="Refresh reservation calendar"
        >
          Refresh
        </AppButton>
      </div>

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
                onClick={() => shiftPeriod(-1)}
              >
                <ChevronLeftIcon className="size-4" />
              </AppButton>
              <AppButton variant="outline" size="sm" onClick={goToToday}>
                Today
              </AppButton>
              <AppButton
                variant="outline"
                size="icon-sm"
                aria-label={`Next ${view}`}
                onClick={() => shiftPeriod(1)}
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

        <p className="mt-3 text-xs text-muted-foreground">
          Each block is a rental order event window. Cancelled orders stay hidden
          unless you filter to Cancelled.
        </p>

        <ul
          className="mt-2 flex flex-wrap gap-2"
          aria-label="Reservation status legend"
        >
          {RENTAL_ORDER_STATUSES.filter((item) => item !== "CANCELLED" || status === "CANCELLED").map(
            (item) => (
              <li key={item}>
                <span
                  className={`inline-flex items-center rounded-sm border-l-2 px-1.5 py-0.5 text-[11px] ${STATUS_EVENT_CLASS[item]}`}
                >
                  {STATUS_LABELS[item]}
                </span>
              </li>
            ),
          )}
        </ul>

        {isTruncated ? (
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            Showing the first {listQuery.data?.items.length} of {totalMatching}{" "}
            matching reservations in this date range. Narrow filters to see the rest.
          </p>
        ) : null}

        {listQuery.isLoading && !listQuery.data ? (
          <LoadingState label="Loading reservation calendar..." />
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No reservations match these filters" : "No reservations in this period"}
            description={
              hasFilters
                ? "Try clearing search or filters. Results apply to the visible week or month."
                : "Rental orders whose event window overlaps these dates will appear here."
            }
            action={
              hasFilters ? (
                <AppButton variant="outline" onClick={clearAllFilters}>
                  Clear filters
                </AppButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <ReservationCalendarMobileList days={mobileDays} events={visibleEvents} />

            <TabsContent value="week" className="mt-4 max-md:hidden">
              <ReservationCalendarWeekView days={days} events={visibleEvents} />
            </TabsContent>
            <TabsContent value="month" className="mt-4 max-md:hidden">
              <ReservationCalendarMonthView
                days={days}
                anchor={anchor}
                events={visibleEvents}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
