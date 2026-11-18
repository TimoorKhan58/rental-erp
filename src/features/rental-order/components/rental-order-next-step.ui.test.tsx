import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RentalOrderNextStep, getRentalOrderNextStep } from "./rental-order-next-step";

const order = (status: Parameters<typeof getRentalOrderNextStep>[0]["status"], endDate = "2026-11-20T00:00:00.000Z") => ({
  id: "o1",
  status,
  endDate,
});

describe("order page next step (usability revamp R3)", () => {
  it("walks an order through its life in plain words", () => {
    const today = "2026-11-18";
    expect(getRentalOrderNextStep(order("DRAFT"), today).action?.label).toBe("Confirm order");
    expect(getRentalOrderNextStep(order("CONFIRMED"), today).action?.label).toBe("Reserve items");
    expect(getRentalOrderNextStep(order("RESERVED"), today).action).toEqual({
      kind: "link",
      label: "Create dispatch",
      href: "/dispatches/new?rentalOrderId=o1",
    });
    expect(getRentalOrderNextStep(order("ON_RENT"), today).title).toBe("Out with the customer");
    expect(getRentalOrderNextStep(order("COMPLETED"), today).title).toBe("Bill the customer");
    expect(getRentalOrderNextStep(order("CANCELLED"), today).action).toBeUndefined();
  });

  it("says how late an order is once its return date has passed", () => {
    const step = getRentalOrderNextStep(order("ON_RENT", "2026-11-15T00:00:00.000Z"), "2026-11-18");
    expect(step).toMatchObject({ title: "Late by 3 days", tone: "urgent" });
    expect(getRentalOrderNextStep(order("ON_RENT", "2026-11-18T00:00:00.000Z"), "2026-11-18").tone).toBe("normal");
  });

  it("runs the confirm action, and hides it from people who may not", () => {
    const onConfirm = vi.fn();
    const step = getRentalOrderNextStep(order("DRAFT"), "2026-11-18");
    const { rerender } = render(<RentalOrderNextStep step={step} allowed onConfirm={onConfirm} onReserve={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm order" }));
    expect(onConfirm).toHaveBeenCalled();
    rerender(<RentalOrderNextStep step={step} allowed={false} onConfirm={onConfirm} onReserve={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Confirm order" })).toBeNull();
    expect(screen.getByText("Confirm the order")).toBeInTheDocument();
  });
});
