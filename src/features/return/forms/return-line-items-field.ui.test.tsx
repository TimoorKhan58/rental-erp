import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import type { CreateReturnFormValues } from "../schemas";
import { ReturnLineItemsField } from "./return-line-items-field";

function Harness({ items }: { items: CreateReturnFormValues["items"] }) {
  const form = useForm<CreateReturnFormValues>({
    defaultValues: { items } as Partial<CreateReturnFormValues>,
  });
  return (
    <FormProvider {...form}>
      <ReturnLineItemsField itemLabelById={new Map([["oi1", "Round table"]])} />
    </FormProvider>
  );
}

describe("receive back on a phone (UI redesign)", () => {
  it("asks for the send-out first instead of showing an empty card", () => {
    render(<Harness items={[{ rentalOrderItemId: "", dispatchItemId: "", quantity: 1, notes: "" }]} />);
    expect(screen.getByText(/Pick the send-out above/)).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("counts what came back and fills everything in one tap", () => {
    render(
      <Harness
        items={[{ rentalOrderItemId: "oi1", dispatchItemId: "d1", quantity: 1, maxQuantity: 30, notes: "" }]}
      />,
    );
    expect(screen.getByText("29 of 30 still out")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Everything came back" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(30);
    expect(screen.getByText("All 30 back")).toBeInTheDocument();
  });
});
