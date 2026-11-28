import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricCard } from "./metric-card";

describe("MetricCard change line (UI redesign)", () => {
  it("shows how the number moved, coloured by whether it is good news", () => {
    render(
      <MetricCard
        label="Profit"
        value="PKR 175,500"
        change={{ text: "Up 18% on the time before", tone: "good" }}
        hint="Income minus costs"
      />,
    );
    const change = screen.getByText("Up 18% on the time before");
    expect(change).toHaveClass("text-success");
    expect(screen.getByText("Income minus costs")).toBeInTheDocument();
  });

  it("marks bad news and leaves out the line when there is nothing to compare", () => {
    const { rerender } = render(
      <MetricCard label="Costs" value="PKR 71,300" change={{ text: "Up 20% on the time before", tone: "bad" }} />,
    );
    expect(screen.getByText("Up 20% on the time before")).toHaveClass("text-destructive");
    rerender(<MetricCard label="Costs" value="PKR 71,300" change={null} />);
    expect(screen.queryByText(/on the time before/)).not.toBeInTheDocument();
  });
});
