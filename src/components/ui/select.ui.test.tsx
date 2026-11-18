import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

describe("Select shows the chosen option's label (usability revamp R4)", () => {
  it("shows 'All warehouses', not the raw value 'all'", () => {
    render(
      <Select value="all">
        <SelectTrigger aria-label="Warehouse">
          <SelectValue placeholder="Warehouse" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All warehouses</SelectItem>
          {["w-1", "w-2"].map((id) => (
            <SelectItem key={id} value={id}>{`Store ${id}`}</SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );
    expect(screen.getByLabelText("Warehouse")).toHaveTextContent("All warehouses");
  });

  it("shows a picked option's name, not its id", () => {
    render(
      <Select value="w-2">
        <SelectTrigger aria-label="Warehouse">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="w-1">Main store</SelectItem>
          <SelectItem value="w-2">City store</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByLabelText("Warehouse")).toHaveTextContent("City store");
    expect(screen.getByLabelText("Warehouse")).not.toHaveTextContent("w-2");
  });
});
