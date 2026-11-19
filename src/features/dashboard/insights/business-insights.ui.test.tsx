import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildBusinessInsights } from "@/modules/reporting/domain/business-insights.rules";
import type {
  BusinessInsightsSource,
  InsightOrderRow,
} from "@/modules/reporting/domain/business-insights.types";

import { deriveInsights, hourLabel } from "./derive-insights";

const permissions = vi.hoisted(() => ({ canRead: true }));
const insightsQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/features/analytics/hooks", () => ({
  useAnalyticsPermissions: () => ({ canRead: permissions.canRead, isLoading: false }),
}));
vi.mock("./use-business-insights", () => ({
  useBusinessInsights: () => insightsQuery.current,
}));
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="chart" />,
}));

import { BusinessInsightsSection, shortItemName } from "./business-insights-section";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function order(id: string, override: Partial<InsightOrderRow> & { bookingDate: Date }): InsightOrderRow {
  return {
    id,
    customerId: "c1",
    status: "COMPLETED",
    eventStartDate: override.bookingDate,
    eventEndDate: override.bookingDate,
    // 13:00 UTC = 6 pm in Karachi.
    createdAt: new Date(override.bookingDate.getTime() + 13 * 3_600_000),
    grandTotal: 10000,
    items: [{ productId: "chair", quantity: 50, numberOfDays: 1, lineTotal: 10000 }],
    ...override,
  };
}

/** A small wedding-hire business: December Saturdays, chairs that sell out. */
function weddingBusiness(): BusinessInsightsSource {
  const orders: InsightOrderRow[] = [];
  for (let index = 0; index < 10; index += 1) {
    const event = index < 6 ? d(2025, 12, 6 + (index % 4) * 7) : d(2026, 10, 3 + (index % 4) * 7);
    orders.push(
      order(`o${index}`, {
        customerId: index < 7 ? "big" : `c${index}`,
        bookingDate: new Date(event.getTime() - 5 * 86_400_000),
        eventStartDate: event,
        eventEndDate: event,
      }),
    );
  }
  return {
    orders,
    customers: [
      { id: "big", code: "CUS-1", name: "Royal Events", firstBookingDate: d(2025, 1, 1) },
      ...[7, 8, 9].map((index) => ({ id: `c${index}`, code: `CUS-${index}`, name: `Customer ${index}`, firstBookingDate: d(2026, 10, 1) })),
    ],
    products: [
      { id: "chair", code: "CH", name: "Chairs", categoryName: "Seating", purchaseCost: 500, isRentable: true, unitsOwned: 100 },
      { id: "stage", code: "ST", name: "Stages", categoryName: "Decor", purchaseCost: 50000, isRentable: true, unitsOwned: 2 },
    ],
    invoices: [{ grandTotal: 40000, balance: 30000, status: "PARTIALLY_PAID", invoiceDate: d(2026, 10, 1), dueDate: d(2026, 10, 8) }],
    payments: [{ amount: 10000, paymentDate: d(2026, 10, 30), method: "CASH", invoiceDate: d(2026, 10, 1) }],
    expenses: [],
    hireIns: [{ rentalOrderId: "o6", productId: "chair", quantity: 30, cost: 6000, hireStartDate: d(2026, 10, 3) }],
    returns: [],
  };
}

function insights() {
  return buildBusinessInsights({
    source: weddingBusiness(),
    months: 12,
    businessToday: d(2026, 11, 19),
    now: new Date("2026-11-19T10:00:00Z"),
    timeZone: "Asia/Karachi",
  });
}

describe("deriveInsights", () => {
  it("names the peak month, day and booking hours in plain words", () => {
    const titles = deriveInsights(insights()).map((card) => card.title);
    expect(titles).toContain("December is your busiest month");
    expect(titles).toContain("Most events start on Saturday");
    expect(titles).toContain("Busiest booking time: 6 pm–8 pm");
    expect(titles).toContain("Quarter 4 is your peak season");
  });

  it("flags shortages, idle stock, dependence on a few customers and unpaid invoices", () => {
    const cards = deriveInsights(insights());
    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));
    expect(byId.shortage?.title).toBe("You ran short of Chairs");
    expect(byId.idle?.detail).toContain("Stages");
    expect(byId.concentration).toBeUndefined(); // only 4 customers: too few to judge
    expect(byId.collection?.title).toBe("Only 25% of invoices are paid");
    expect(byId["lead-time"]?.title).toBe("Customers book about 5 days ahead");
  });

  it("stays quiet about seasons when there is too little history", () => {
    const data = insights();
    const small = { ...data, seasons: { ...data.seasons, totalOrders: 3 } };
    expect(deriveInsights(small).some((card) => card.id === "peak-month")).toBe(false);
  });

  it("says same-day booking in words, not as 0 days", () => {
    const data = insights();
    const sameDay = { ...data, headline: { ...data.headline, medianLeadDays: 0 } };
    const card = deriveInsights(sameDay).find((item) => item.id === "lead-time");
    expect(card?.title).toBe("Most customers book on the day of the event");
  });

  it("labels charts with short item names", () => {
    expect(shortItemName("Foam Chair / فوم کرسی")).toBe("Foam Chair");
    expect(shortItemName("Very Long Item Name For Stage")).toBe("Very Long Item Na…");
  });

  it("reads hours as a person would", () => {
    expect([0, 9, 12, 18].map(hourLabel)).toEqual(["12 am", "9 am", "12 pm", "6 pm"]);
  });
});

describe("BusinessInsightsSection", () => {
  beforeEach(() => {
    permissions.canRead = true;
    insightsQuery.current = { data: insights(), isError: false, isFetching: false };
  });

  it("shows headline numbers, insight cards and the other tabs", async () => {
    render(<BusinessInsightsSection />);
    expect(screen.getByRole("heading", { name: "Business insights" })).toBeInTheDocument();
    expect(screen.getByText("Sales booked")).toBeInTheDocument();
    expect(screen.getByText("December is your busiest month")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Stock" }));
    expect(screen.getByText("Every item at a glance")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /Chairs/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Customers" }));
    expect(screen.getByRole("cell", { name: /Royal Events/ })).toBeInTheDocument();
  });

  it("is hidden from people who cannot read reports", () => {
    permissions.canRead = false;
    const { container } = render(<BusinessInsightsSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says so when the numbers cannot be loaded", () => {
    insightsQuery.current = { data: undefined, isError: true, isFetching: false };
    render(<BusinessInsightsSection />);
    expect(screen.getByRole("alert")).toHaveTextContent("Business insights could not be loaded");
  });
});
