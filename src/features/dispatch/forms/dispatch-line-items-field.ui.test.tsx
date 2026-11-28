import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { clampStep } from "@/components/design-system/form";
import type { CreateDispatchFormValues } from "../schemas";
import { DispatchLineItemsField, stepFor } from "./dispatch-line-items-field";

function Harness({ quantity, max }: { quantity: number; max: number }) {
  const form = useForm<CreateDispatchFormValues>({
    defaultValues: {
      items: [{ productId: "p1", rentalOrderItemId: "i1", quantity, maxQuantity: max, notes: "" }],
    } as Partial<CreateDispatchFormValues>,
  });
  return (
    <FormProvider {...form}>
      <DispatchLineItemsField productLabelById={new Map([["p1", "Plastic chair"]])} />
    </FormProvider>
  );
}

describe("send out on a phone (UI redesign)", () => {
  it("keeps stepper values whole and in range", () => {
    expect(clampStep(5, 1, 4)).toBe(4);
    expect(clampStep(0, 1, 4)).toBe(1);
    expect(clampStep(2.6, 1, 4)).toBe(3);
    expect(clampStep(Number.NaN, 0)).toBe(0);
  });

  it("steps by 10 for big counts and 1 for small ones", () => {
    expect(stepFor(400)).toBe(10);
    expect(stepFor(12)).toBe(1);
    expect(stepFor(undefined)).toBe(1);
  });

  it("counts with − and +, and says how many are left behind", () => {
    render(<Harness quantity={4} max={4} />);
    expect(screen.getByText("All 4 ready")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "One less How many Plastic chair" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(3);
    expect(screen.getByText("1 fewer than the 4 ready")).toBeInTheDocument();

    // + stops at what is ready.
    const plus = screen.getByRole("button", { name: "One more How many Plastic chair" });
    fireEvent.click(plus);
    expect(screen.getByRole("spinbutton")).toHaveValue(4);
    expect(plus).toBeDisabled();
  });

  it("loads everything ready in one tap", () => {
    render(<Harness quantity={1} max={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Load everything ready" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(30);
  });
});
