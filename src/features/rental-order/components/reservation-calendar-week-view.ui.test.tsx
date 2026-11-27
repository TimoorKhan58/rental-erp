import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { busiestWarehouse, dayFreeTone } from "./daily-free-stock";
import { ReservationCalendarWeekView, weekBarColumns } from "./reservation-calendar-week-view";

const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 23 + i)); // Mon 23 – Sun 29 Nov

describe("week timeline (UI redesign)", () => {
  it("clips an order's bar to the week", () => {
    expect(weekBarColumns({ start: new Date(2026, 10, 25), end: new Date(2026, 10, 27) }, week)).toEqual({ from: 2, to: 4 });
    expect(weekBarColumns({ start: new Date(2026, 10, 20), end: new Date(2026, 10, 24) }, week)).toEqual({ from: 0, to: 1 });
    expect(weekBarColumns({ start: new Date(2026, 10, 28), end: new Date(2026, 11, 3) }, week)).toEqual({ from: 5, to: 6 });
    expect(weekBarColumns({ start: new Date(2026, 11, 1), end: new Date(2026, 11, 2) }, week)).toBeNull();
  });

  it("shows one row per order with the customer first", () => {
    render(
      <ReservationCalendarWeekView
        days={week}
        events={[
          { id: "a", orderNumber: "RO-2", customerId: "c2", customerLabel: "Noor Hall", status: "CONFIRMED", start: new Date(2026, 10, 28), end: new Date(2026, 10, 28) },
          { id: "b", orderNumber: "RO-1", customerId: "c1", customerLabel: "Usman Ali", status: "ON_RENT", start: new Date(2026, 10, 24), end: new Date(2026, 10, 26) },
        ]}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Usman Ali");
    expect(rows[0]).toHaveTextContent("With customer");
    expect(rows[1]).toHaveTextContent("Noor Hall");
  });

  it("says so when the week is empty", () => {
    render(<ReservationCalendarWeekView days={week} events={[]} />);
    expect(screen.getByText("No orders out this week.")).toBeInTheDocument();
  });
});

describe("free to rent each day", () => {
  it("marks none, low and free", () => {
    expect(dayFreeTone(0, 12)).toBe("none");
    expect(dayFreeTone(-2, 12)).toBe("none");
    expect(dayFreeTone(1, 12)).toBe("low");
    expect(dayFreeTone(7, 12)).toBe("free");
  });

  it("opens on the warehouse that keeps the most kinds of item", () => {
    expect(busiestWarehouse([{ warehouseId: "a" }, { warehouseId: "b" }, { warehouseId: "b" }])).toBe("b");
    expect(busiestWarehouse([])).toBeUndefined();
  });
});
