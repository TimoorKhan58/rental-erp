import { describe, expect, it } from "vitest";

import { buildDashboardWorklist, type WorklistOrder } from "./dashboard-worklist";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = day("2026-11-18");

function order(overrides: Partial<WorklistOrder>): WorklistOrder {
  return {
    id: overrides.orderNumber ?? "o",
    orderNumber: "RO-1",
    status: "CONFIRMED",
    customerName: "Ali",
    eventStartDate: TODAY,
    expectedReturnDate: day("2026-11-20"),
    ...overrides,
  };
}

describe("buildDashboardWorklist (usability revamp R2)", () => {
  it("counts orders going out today and schedules the next 7 days", () => {
    const result = buildDashboardWorklist({
      today: TODAY,
      invoices: [],
      orders: [
        order({ orderNumber: "RO-1", eventStartDate: TODAY }),
        order({ orderNumber: "RO-2", status: "RESERVED", eventStartDate: day("2026-11-24") }),
        order({ orderNumber: "RO-3", eventStartDate: day("2026-11-25") }), // 8th day: outside
        order({ orderNumber: "RO-4", status: "DRAFT", eventStartDate: TODAY }), // not booked yet
        order({ orderNumber: "RO-5", status: "CANCELLED", eventStartDate: TODAY }),
      ],
    });

    expect(result.today).toBe("2026-11-18");
    expect(result.ordersGoingOutToday).toBe(1);
    expect(result.schedule).toEqual([
      { date: "2026-11-18", direction: "out", orderId: "RO-1", orderNumber: "RO-1", customerName: "Ali" },
      { date: "2026-11-24", direction: "out", orderId: "RO-2", orderNumber: "RO-2", customerName: "Ali" },
    ]);
  });

  it("tracks orders with customers, those coming back this week and those late", () => {
    const result = buildDashboardWorklist({
      today: TODAY,
      invoices: [],
      orders: [
        order({ orderNumber: "RO-6", status: "ON_RENT", eventStartDate: day("2026-11-10"), expectedReturnDate: day("2026-11-19") }),
        order({ orderNumber: "RO-7", status: "DISPATCHED", eventStartDate: day("2026-11-01"), expectedReturnDate: day("2026-11-15") }),
        order({ orderNumber: "RO-8", status: "PARTIALLY_RETURNED", eventStartDate: day("2026-11-01"), expectedReturnDate: TODAY }),
        order({ orderNumber: "RO-9", status: "COMPLETED", expectedReturnDate: day("2026-11-01") }),
      ],
    });

    expect(result.ordersOutWithCustomers).toBe(3);
    expect(result.lateReturns).toBe(1);
    expect(result.schedule.map((entry) => `${entry.date} ${entry.direction} ${entry.orderNumber}`)).toEqual([
      "2026-11-18 back RO-8",
      "2026-11-19 back RO-6",
    ]);
  });

  it("adds up money still to collect and how late the oldest unpaid invoice is", () => {
    const result = buildDashboardWorklist({
      today: TODAY,
      orders: [],
      invoices: [
        { status: "ISSUED", balance: 1500.5, dueDate: day("2026-11-11") },
        { status: "PARTIALLY_PAID", balance: 499.5, dueDate: day("2026-11-20") },
        { status: "ISSUED", balance: 1000, dueDate: null },
        { status: "PAID", balance: 0, dueDate: day("2026-10-01") },
        { status: "DRAFT", balance: 900, dueDate: day("2026-10-01") },
      ],
    });

    expect(result).toMatchObject({
      unpaidInvoices: 3,
      overdueInvoices: 1,
      oldestOverdueDays: 7,
      amountToCollect: 3000,
    });
  });

  it("is calm when there is nothing to do", () => {
    expect(buildDashboardWorklist({ today: TODAY, orders: [], invoices: [] })).toMatchObject({
      ordersGoingOutToday: 0,
      ordersOutWithCustomers: 0,
      lateReturns: 0,
      unpaidInvoices: 0,
      oldestOverdueDays: null,
      schedule: [],
    });
  });
});
