import { describe, expect, it } from "vitest";

import {
  buildBusinessInsights,
  localWeekdayAndHour,
  resolveBusinessInsightsWindow,
} from "./business-insights.rules";
import type {
  BusinessInsightsSource,
  InsightOrderRow,
} from "./business-insights.types";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

const TODAY = d(2026, 11, 19);
const NOW = new Date("2026-11-19T10:00:00Z");

function order(
  id: string,
  override: Partial<InsightOrderRow> & { bookingDate: Date },
): InsightOrderRow {
  return {
    id,
    customerId: "c1",
    status: "COMPLETED",
    eventStartDate: override.bookingDate,
    eventEndDate: override.bookingDate,
    createdAt: override.bookingDate,
    grandTotal: 1000,
    items: [],
    ...override,
  };
}

function source(partial: Partial<BusinessInsightsSource>): BusinessInsightsSource {
  return {
    orders: [],
    customers: [],
    products: [],
    invoices: [],
    payments: [],
    expenses: [],
    hireIns: [],
    returns: [],
    ...partial,
  };
}

function build(partial: Partial<BusinessInsightsSource>, months: 3 | 6 | 12 | 24 = 12) {
  return buildBusinessInsights({
    source: source(partial),
    months,
    businessToday: TODAY,
    now: NOW,
    timeZone: "Asia/Karachi",
  });
}

describe("resolveBusinessInsightsWindow", () => {
  it("starts on the first of the month and compares with the same length before", () => {
    const window = resolveBusinessInsightsWindow(3, TODAY);
    expect(window.from).toEqual(d(2026, 9, 1));
    expect(window.to).toEqual(TODAY);
    expect(window.previousFrom).toEqual(d(2026, 6, 1));
    expect(window.previousTo).toEqual(d(2026, 8, 19));
    expect(window.seasonFrom).toEqual(d(2024, 12, 1));
  });

  it("keeps month-end days valid", () => {
    const window = resolveBusinessInsightsWindow(3, d(2026, 5, 31));
    expect(window.previousTo).toEqual(d(2026, 2, 28));
  });
});

describe("localWeekdayAndHour", () => {
  it("reads the hour and weekday in the business time zone", () => {
    // 19 Nov 2026 20:30 UTC is Friday 20 Nov 01:30 in Karachi (UTC+5).
    expect(localWeekdayAndHour(new Date("2026-11-19T20:30:00Z"), "Asia/Karachi")).toEqual({
      weekday: 5,
      hour: 1,
    });
  });
});

describe("buildBusinessInsights", () => {
  it("compares the period with the one before and skips drafts and cancellations", () => {
    const insights = build(
      {
        orders: [
          order("a", { bookingDate: d(2026, 10, 5), grandTotal: 3000 }),
          order("b", { bookingDate: d(2026, 11, 2), grandTotal: 1000 }),
          order("x", { bookingDate: d(2026, 11, 3), status: "CANCELLED" }),
          order("y", { bookingDate: d(2026, 11, 3), status: "DRAFT" }),
          order("p", { bookingDate: d(2026, 7, 1), grandTotal: 2000 }),
        ],
      },
      3,
    );

    expect(insights.headline.bookedValue).toEqual({ current: 4000, previous: 2000, changePercent: 100 });
    expect(insights.headline.orders.current).toBe(2);
    expect(insights.headline.averageOrderValue.current).toBe(2000);
    // 1 cancelled of 3 non-draft orders.
    expect(insights.headline.cancellationPercent).toBe(33.3);
    expect(insights.monthly.map((month) => [month.month, month.orders])).toEqual([
      ["2026-09", 0],
      ["2026-10", 1],
      ["2026-11", 1],
    ]);
  });

  it("finds peaks by event month, quarter, weekday and entry hour", () => {
    const insights = build({
      orders: [
        // Saturday 5 Dec 2025, entered 18:10 Karachi time.
        order("a", { bookingDate: d(2025, 11, 20), eventStartDate: d(2025, 12, 5), eventEndDate: d(2025, 12, 6), createdAt: new Date("2025-11-20T13:10:00Z") }),
        order("b", { bookingDate: d(2025, 11, 21), eventStartDate: d(2025, 12, 12), eventEndDate: d(2025, 12, 12), createdAt: new Date("2025-11-21T13:40:00Z") }),
        order("c", { bookingDate: d(2026, 3, 1), eventStartDate: d(2026, 3, 4), eventEndDate: d(2026, 3, 4), createdAt: new Date("2026-03-01T05:00:00Z") }),
      ],
    });

    const busiestMonth = [...insights.seasons.byMonthOfYear].sort((a, b) => b.orders - a.orders)[0];
    expect(busiestMonth).toMatchObject({ key: 12, orders: 2 });
    expect(insights.seasons.byQuarter.map((quarter) => quarter.orders)).toEqual([1, 0, 0, 2]);
    expect(insights.seasons.byEventWeekday[5]?.orders).toBe(2); // Fridays
    expect(insights.seasons.byEntryHour[18]?.orders).toBe(2);
    expect(insights.seasons.entryHeatmap[4]?.[18]).toBe(1); // Thursday 18:00
    expect(insights.seasons.totalOrders).toBe(3);
  });

  it("measures lead time and rental length", () => {
    const insights = build({
      orders: [
        order("a", { bookingDate: d(2026, 11, 1), eventStartDate: d(2026, 11, 1), eventEndDate: d(2026, 11, 1) }),
        order("b", { bookingDate: d(2026, 11, 1), eventStartDate: d(2026, 11, 6), eventEndDate: d(2026, 11, 8) }),
        order("c", { bookingDate: d(2026, 10, 1), eventStartDate: d(2026, 11, 10), eventEndDate: d(2026, 11, 20) }),
      ],
    });

    expect(insights.leadTime.map((bucket) => bucket.orders)).toEqual([1, 0, 1, 0, 0, 1]);
    expect(insights.rentalLength.map((bucket) => bucket.orders)).toEqual([1, 0, 1, 0, 1, 0]);
    expect(insights.headline.medianLeadDays).toBe(5);
  });

  it("works out stock earning power, time on rent, hire-ins and damage", () => {
    const insights = build(
      {
        products: [
          { id: "chair", code: "CH", name: "Chairs", categoryName: "Seating", purchaseCost: 100, isRentable: true, unitsOwned: 10 },
          { id: "fan", code: "FN", name: "Fans", categoryName: null, purchaseCost: 500, isRentable: true, unitsOwned: 4 },
        ],
        orders: [
          order("a", {
            bookingDate: d(2026, 11, 1),
            eventStartDate: d(2026, 11, 1),
            eventEndDate: d(2026, 11, 10),
            items: [{ productId: "chair", quantity: 10, numberOfDays: 10, lineTotal: 500 }],
          }),
        ],
        hireIns: [{ rentalOrderId: "a", productId: "chair", quantity: 5, cost: 250, hireStartDate: d(2026, 11, 1) }],
        returns: [{ productId: "chair", returned: 10, damaged: 1, lost: 1, damageCharge: 300, date: d(2026, 11, 11) }],
      },
      3,
    );

    const chairs = insights.products.find((product) => product.productId === "chair")!;
    expect(chairs).toMatchObject({
      orders: 1,
      quantity: 10,
      quantityDays: 100,
      revenue: 500,
      revenuePerUnit: 50,
      paybackPercent: 50,
      hireInTimes: 1,
      hireInQuantity: 5,
      hireInCost: 250,
      damageLossPercent: 20,
      damageCharges: 300,
    });
    // 100 unit-days out of 10 units × 80 days (1 Sep – 19 Nov).
    expect(chairs.utilizationPercent).toBe(12.5);
    const fans = insights.products.find((product) => product.productId === "fan")!;
    expect(fans.revenue).toBe(0);
    expect(fans.utilizationPercent).toBe(0);
    expect(insights.headline.stockOutPercent).toBe(100);
    expect(insights.categories).toEqual([{ name: "Seating", revenue: 500, quantity: 10 }]);
  });

  it("splits new and returning customers and measures concentration", () => {
    const insights = build({
      customers: [
        { id: "c1", code: "CUS-1", name: "Old Friend", firstBookingDate: d(2024, 1, 1) },
        { id: "c2", code: "CUS-2", name: "Newcomer", firstBookingDate: d(2026, 11, 1) },
      ],
      orders: [
        order("a", { customerId: "c1", bookingDate: d(2026, 11, 1), grandTotal: 3000 }),
        order("b", { customerId: "c2", bookingDate: d(2026, 11, 1), grandTotal: 1000 }),
      ],
    });

    expect(insights.customers).toMatchObject({
      activeCount: 2,
      newCount: 1,
      returningCount: 1,
      repeatPercent: 50,
      top5SharePercent: 100,
      averageValuePerCustomer: 2000,
    });
    expect(insights.customers.top[0]).toMatchObject({ name: "Old Friend", sharePercent: 75 });
    expect(insights.monthly.at(-1)).toMatchObject({ newCustomers: 1, returningCustomers: 1 });
  });

  it("measures collection, days to pay, methods, ageing and margin", () => {
    const insights = build({
      orders: [order("a", { bookingDate: d(2026, 11, 1), grandTotal: 10000 })],
      invoices: [
        { grandTotal: 6000, balance: 0, status: "PAID", invoiceDate: d(2026, 11, 1), dueDate: d(2026, 11, 8) },
        { grandTotal: 4000, balance: 4000, status: "ISSUED", invoiceDate: d(2026, 9, 1), dueDate: d(2026, 9, 10) },
      ],
      payments: [
        { amount: 4000, paymentDate: d(2026, 11, 5), method: "CASH", invoiceDate: d(2026, 11, 1) },
        { amount: 2000, paymentDate: d(2026, 11, 11), method: "BANK_TRANSFER", invoiceDate: d(2026, 11, 1) },
      ],
      expenses: [{ amount: 2500, expenseDate: d(2026, 11, 3) }],
    });

    expect(insights.money).toMatchObject({
      billed: 10000,
      collected: 6000,
      collectionPercent: 60,
      averageDaysToPay: 6,
      outstanding: 4000,
      overdue: 4000,
      expenses: 2500,
      marginPercent: 75,
    });
    expect(insights.money.paymentMethods[0]).toEqual({ method: "CASH", amount: 4000, count: 1 });
    expect(insights.money.aging.find((bucket) => bucket.amount > 0)?.label).toBe("61–90 days");
  });

  it("returns empty but well-formed results for a new business", () => {
    const insights = build({});
    expect(insights.headline.orders.current).toBe(0);
    expect(insights.headline.bookedValue.changePercent).toBeNull();
    expect(insights.monthly).toHaveLength(12);
    expect(insights.money.collectionPercent).toBeNull();
    expect(insights.customers.top).toEqual([]);
  });
});
