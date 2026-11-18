"use client";

import { cn } from "@/lib/utils";
import type { RentalOrderStage, RentalOrderStatus } from "../types";

export type StageTabValue = RentalOrderStage | "all";

/** Statuses behind each simple stage (mirrors the server's rental-order-stage). */
export const STAGE_STATUSES: Record<RentalOrderStage, readonly RentalOrderStatus[]> = {
  drafts: ["DRAFT"],
  upcoming: ["CONFIRMED", "RESERVED"],
  out: ["DISPATCHED", "ON_RENT", "PARTIALLY_RETURNED"],
  late: ["DISPATCHED", "ON_RENT", "PARTIALLY_RETURNED"],
  finished: ["RETURNED", "COMPLETED"],
  cancelled: ["CANCELLED"],
};

export const STAGE_TABS: Array<{ value: StageTabValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "upcoming", label: "Upcoming" },
  { value: "out", label: "Out with customers" },
  { value: "late", label: "Late" },
  { value: "finished", label: "Finished" },
  { value: "cancelled", label: "Cancelled" },
];

/** Adds up status counts into stage counts; Late comes from its own query. */
export function stageCounts(
  statusCounts: Partial<Record<"all" | RentalOrderStatus, number>> | undefined,
  lateCount: number | undefined,
): Partial<Record<StageTabValue, number>> {
  if (!statusCounts) return {};
  const result: Partial<Record<StageTabValue, number>> = { all: statusCounts.all };
  for (const [stage, statuses] of Object.entries(STAGE_STATUSES) as Array<[RentalOrderStage, readonly RentalOrderStatus[]]>) {
    if (stage === "late") continue;
    result[stage] = statuses.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);
  }
  if (lateCount !== undefined) result.late = lateCount;
  return result;
}

type RentalOrderStageTabsProps = {
  value: StageTabValue;
  onChange: (value: StageTabValue) => void;
  counts?: Partial<Record<StageTabValue, number>>;
};

/** One row of plain-word tabs in place of 10 status chips (usability revamp R3). */
export function RentalOrderStageTabs({ value, onChange, counts }: RentalOrderStageTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div role="tablist" aria-label="Show orders" className="flex w-max gap-1 border-b border-border">
        {STAGE_TABS.map((tab) => {
          const active = value === tab.value;
          const count = counts?.[tab.value];
          const urgent = tab.value === "late" && (count ?? 0) > 0;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    urgent ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count.toLocaleString()}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
