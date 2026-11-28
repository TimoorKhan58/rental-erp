"use client";

import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import { getInventoryList } from "@/features/inventory/services/inventory.service";
import { format, formatISO } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiClientError } from "@/lib/api/types";
import { queryKeys } from "@/lib/query";
import { cn, formatNumber } from "@/lib/utils";

import { getDateAwareAvailability } from "../services";
import { isToday } from "../utils/reservation-calendar.utils";

type Option = { id: string; label: string };

type DailyFreeStockProps = {
  days: Date[];
  productOptions: Option[];
  warehouseOptions: Option[];
  /** The warehouse picked in the calendar filters, if any. */
  warehouseId?: string;
};

export type DayFreeTone = "free" | "low" | "none";

/** The warehouse that keeps the most kinds of item. */
export function busiestWarehouse(
  rows: ReadonlyArray<{ warehouseId: string }>,
): string | undefined {
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.warehouseId, (counts.get(row.warehouseId) ?? 0) + 1);
  let best: string | undefined;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

/** "Low" is under 15% of what the warehouse holds. */
export function dayFreeTone(free: number, onHand: number): DayFreeTone {
  if (free <= 0) return "none";
  if (onHand > 0 && free / onHand < 0.15) return "low";
  return "free";
}

const TONE_CLASS: Record<DayFreeTone, string> = {
  free: "bg-card text-success",
  low: "bg-warning-muted text-warning-foreground",
  none: "bg-error-muted text-destructive",
};

const TONE_NOTE: Record<DayFreeTone, string> = {
  free: "Free",
  low: "Running low",
  none: "None free",
};

/**
 * How many of one item are free to rent on each day of the week (UI
 * redesign). Uses the same date-aware availability as the order form,
 * one day at a time, so clashes show before you book.
 */
export function DailyFreeStock({
  days,
  productOptions: allProductOptions,
  warehouseOptions,
  warehouseId,
}: DailyFreeStockProps) {
  const [productId, setProductId] = useState<string | undefined>(undefined);

  // Stock rows: for the picked warehouse, or for all of them when none is
  // picked (then the warehouse holding the most kinds of item is used).
  const stockQuery = useQuery({
    queryKey: queryKeys.inventory.list({
      warehouseId: warehouseId ?? "all",
      everyPage: true,
    }),
    queryFn: () =>
      fetchAllPages(getInventoryList, warehouseId ? { warehouseId } : {}),
    staleTime: 60_000,
  });
  const stockedRows = useMemo(
    () =>
      (stockQuery.data?.items ?? []).filter((row) => row.quantityOnHand > 0),
    [stockQuery.data],
  );
  const chosenWarehouse =
    warehouseId ?? busiestWarehouse(stockedRows) ?? warehouseOptions[0]?.id;
  // Only offer items this warehouse actually keeps.
  const productOptions = useMemo(() => {
    const kept = new Set(
      stockedRows
        .filter((row) => row.warehouseId === chosenWarehouse)
        .map((row) => row.productId),
    );
    return allProductOptions.filter((option) => kept.has(option.id));
  }, [stockedRows, chosenWarehouse, allProductOptions]);
  const chosenProduct =
    productId && productOptions.some((option) => option.id === productId)
      ? productId
      : productOptions[0]?.id;

  const queries = useQueries({
    queries: days.map((day) => {
      const date = formatISO(day, { representation: "date" });
      const params = {
        productId: chosenProduct ?? "",
        warehouseId: chosenWarehouse ?? "",
        startDate: date,
        endDate: date,
      };
      return {
        queryKey: queryKeys.rentalOrders.availability(params),
        queryFn: () => getDateAwareAvailability(params),
        enabled: Boolean(chosenProduct && chosenWarehouse),
        staleTime: 30_000,
      };
    }),
  });

  const warehouseLabel = useMemo(
    () =>
      warehouseOptions.find((option) => option.id === chosenWarehouse)?.label,
    [warehouseOptions, chosenWarehouse],
  );

  if (!chosenWarehouse || stockQuery.isLoading) {
    return null;
  }

  if (!chosenProduct) {
    return (
      <section className="rounded-xl border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Free to rent each day
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {warehouseLabel ?? "This warehouse"} has no stock yet. Pick another
          warehouse in the filters above.
        </p>
      </section>
    );
  }

  // The server says "not found" when this warehouse holds none of the item.
  const notStockedHere =
    queries.length > 0 &&
    queries.every(
      (query) =>
        query.error instanceof ApiClientError && query.error.status === 404,
    );
  const gridTemplate = {
    gridTemplateColumns: `13rem repeat(${days.length}, minmax(0, 1fr))`,
  };
  const onHand = queries.find((query) => query.data)?.data?.quantityOnHand ?? 0;
  const shortDays = queries.filter(
    (query) => query.data && query.data.dateAwareAvailableQuantity <= 0,
  ).length;

  return (
    <section
      aria-labelledby="daily-free-heading"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2
            id="daily-free-heading"
            className="text-sm font-semibold text-foreground"
          >
            Free to rent each day
          </h2>
          <p className="text-xs text-muted-foreground">
            {warehouseLabel ? `In ${warehouseLabel}. ` : ""}Pick a warehouse in
            the filters above to change it.
          </p>
        </div>
        <Select
          value={chosenProduct}
          onValueChange={(value) => setProductId(value ?? undefined)}
        >
          <SelectTrigger className="w-64" aria-label="Item">
            <SelectValue placeholder="Pick an item" />
          </SelectTrigger>
          <SelectContent>
            {productOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {notStockedHere ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          {warehouseLabel ?? "This warehouse"} doesn&apos;t keep this item. Pick
          another item, or another warehouse in the filters above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[56rem]" style={gridTemplate}>
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {
                  productOptions.find((option) => option.id === chosenProduct)
                    ?.label
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(onHand)} in this warehouse
              </p>
            </div>
            {days.map((day, index) => {
              const query = queries[index];
              const data = query?.data;
              if (!data) {
                return (
                  <div
                    key={day.toISOString()}
                    className="border-l border-border px-2 py-3 text-xs text-muted-foreground"
                  >
                    {query?.isError ? "Couldn't load" : "…"}
                  </div>
                );
              }
              const free = data.dateAwareAvailableQuantity;
              const tone = dayFreeTone(free, data.quantityOnHand);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex flex-col justify-center border-l border-border px-2 py-3",
                    TONE_CLASS[tone],
                    isToday(day) && "shadow-[inset_0_3px_0_var(--primary)]",
                  )}
                >
                  <span className="text-lg font-semibold tabular-nums">
                    {formatNumber(Math.max(free, 0))}
                  </span>
                  <span className="text-xs">
                    <span className="sr-only">
                      {format(day, "EEE d MMM")}:{" "}
                    </span>
                    {TONE_NOTE[tone]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!notStockedHere && shortDays > 0 ? (
        <p className="border-t border-border bg-warning-muted/40 px-4 py-2.5 text-sm text-foreground">
          None free on {shortDays === 1 ? "1 day" : `${shortDays} days`} this
          week. Hire more in, or book a different day.
        </p>
      ) : null}
    </section>
  );
}
