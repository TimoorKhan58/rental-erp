import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RentalOrderProgress, currentProgressIndex } from "./rental-order-progress";

describe("RentalOrderProgress (UI redesign)", () => {
  it.each([
    ["DRAFT", null, 0],
    ["CONFIRMED", null, 1],
    ["RESERVED", null, 1],
    ["DISPATCHED", null, 2],
    ["ON_RENT", null, 2],
    ["PARTIALLY_RETURNED", null, 2],
    ["RETURNED", null, 3],
    ["RETURNED", "DRAFT", 3],
    ["RETURNED", "VOID", 3],
    ["COMPLETED", "ISSUED", 4],
    ["COMPLETED", "PARTIALLY_PAID", 4],
    ["COMPLETED", "PAID", 5],
  ] as const)("%s with invoice %s is at step %i", (status, invoice, index) => {
    expect(currentProgressIndex(status, invoice)).toBe(index);
  });

  it("marks done steps and the current step", () => {
    render(<RentalOrderProgress status="ON_RENT" invoiceStatus={null} />);
    const steps = screen.getAllByRole("listitem");
    expect(steps.map((s) => s.textContent)).toEqual([
      "Booked (done)",
      "Sent out (done)",
      "Back",
      "Invoiced",
      "Paid",
    ]);
    expect(steps[2]).toHaveAttribute("aria-current", "step");
  });

  it("says so when the order is cancelled", () => {
    render(<RentalOrderProgress status="CANCELLED" invoiceStatus={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("This order was cancelled.");
  });
});
