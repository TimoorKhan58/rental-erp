import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LiveDashboardSummary } from "../../types";
import { TodayWorklist, buildWorkItems } from "./today-worklist";
import { WeekSchedule } from "./week-schedule";

function summary(worklist: Partial<LiveDashboardSummary["worklist"]>, extra: Partial<LiveDashboardSummary> = {}): LiveDashboardSummary {
  return {
    totalCustomers: 0, totalSuppliers: 0, totalProducts: 0, totalWarehouses: 0,
    inventoryValue: 0, inventoryQuantity: 0, reservedQuantity: 0, availableQuantity: 0,
    rentalOrders: 0, confirmedOrders: 0, reservedOrders: 0, completedRentals: 0,
    dispatchesReady: 0, dispatchesInProgress: 0, pendingReturns: 0,
    repairsPending: 0, repairsInProgress: 0, maintenanceScheduled: 0, maintenanceInProgress: 0,
    openPurchaseOrders: 0, completedPurchaseOrders: 0, outstandingInvoices: 0, paidInvoices: 0,
    revenueThisMonth: 0, paymentsThisMonth: 0, averageRentalDuration: 0,
    ...extra,
    worklist: {
      today: "2026-11-18", ordersGoingOutToday: 0, ordersOutWithCustomers: 0, lateReturns: 0,
      unpaidInvoices: 0, overdueInvoices: 0, oldestOverdueDays: null, amountToCollect: 0, schedule: [],
      ...worklist,
    },
  };
}

describe("dashboard: your work today (usability revamp R2)", () => {
  it("puts late returns first and reads counts in plain words", () => {
    render(
      <TodayWorklist
        summary={summary(
          { lateReturns: 1, unpaidInvoices: 2, overdueInvoices: 1, oldestOverdueDays: 1, amountToCollect: 1500 },
          { pendingReturns: 3, repairsPending: 1 },
        )}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("1 order late coming back");
    expect(screen.getByText(/2 unpaid invoices: .*1,500.* to collect/)).toBeInTheDocument();
    expect(screen.getByText(/1 invoice past the due date; the oldest by 1 day\./)).toBeInTheDocument();
    expect(screen.getByText("3 returns waiting to be checked")).toBeInTheDocument();
    expect(screen.getByText("1 repair job open")).toBeInTheDocument();
    expect(within(rows[0]!).getByRole("link", { name: "See returns" })).toHaveAttribute("href", "/returns");
  });

  it("stays calm when there is nothing to do and hides the late row", () => {
    const items = buildWorkItems(summary({}));
    expect(items.map((item) => item.title)).toEqual([
      "All invoices are paid",
      "No returns waiting",
      "No repairs open",
      "Nothing to send out today",
    ]);
    expect(items.every((item) => item.tone === "calm")).toBe(true);
  });
});

describe("dashboard: next 7 days", () => {
  it("shows what goes out and comes back, each linking to its order", () => {
    render(
      <WeekSchedule
        today="2026-11-18"
        entries={[
          { date: "2026-11-18", direction: "out", orderId: "o1", orderNumber: "RO-1", customerName: "Ali Tents" },
          { date: "2026-11-20", direction: "back", orderId: "o2", orderNumber: "RO-2", customerName: "Khan Events" },
        ]}
      />,
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Out: Ali Tents" })).toHaveAttribute("href", "/rental-orders/o1");
    expect(screen.getByRole("link", { name: "Back: Khan Events" })).toHaveAttribute("href", "/rental-orders/o2");
  });

  it("says so when the week is empty", () => {
    render(<WeekSchedule today="2026-11-18" entries={[]} />);
    expect(screen.getByText("Nothing is going out or coming back in the next 7 days.")).toBeInTheDocument();
  });
});
