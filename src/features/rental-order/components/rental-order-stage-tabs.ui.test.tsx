import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RentalOrderStageTabs, stageCounts } from "./rental-order-stage-tabs";

describe("order list tabs (usability revamp R3)", () => {
  it("adds status counts up into stages", () => {
    expect(
      stageCounts({ all: 20, DRAFT: 2, CONFIRMED: 3, RESERVED: 1, DISPATCHED: 4, ON_RENT: 5, RETURNED: 2, COMPLETED: 2, CANCELLED: 1 }, 3),
    ).toEqual({ all: 20, drafts: 2, upcoming: 4, out: 9, late: 3, finished: 4, cancelled: 1 });
  });

  it("marks the open tab and reports clicks", () => {
    const onChange = vi.fn();
    render(<RentalOrderStageTabs value="out" onChange={onChange} counts={{ late: 2 }} />);
    expect(screen.getByRole("tab", { name: /Out with customers/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: /Late/ }));
    expect(onChange).toHaveBeenCalledWith("late");
  });
});
