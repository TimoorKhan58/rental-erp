import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTableShell, type DataTableColumn } from "./data-table-shell";

type StressRow = {
  id: string;
  name: string;
  status: string;
  notes: string;
};

const columns: Array<DataTableColumn<StressRow>> = [
  { id: "name", header: "Customer", cell: (row) => row.name },
  { id: "status", header: "Status", cell: (row) => row.status },
  { id: "notes", header: "Notes", cell: (row) => row.notes },
];

function buildRows(count: number): StressRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `customer-${index + 1}`,
    name: `Customer ${index + 1}`,
    status: index % 5 === 0 ? "Inactive" : "Active",
    notes:
      index % 11 === 0
        ? "A deliberately long delivery instruction that must remain readable without hiding actions."
        : "Standard delivery",
  }));
}

describe("DataTableShell large-dataset UX", () => {
  it("renders 500 records without dropping rows or columns", () => {
    const rows = buildRows(500);
    const { container } = render(
      <DataTableShell columns={columns} data={rows} getRowId={(row) => row.id} />,
    );

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(columns.length);
    expect(within(table).getAllByRole("row")).toHaveLength(rows.length + 1);
    expect(screen.getByText("Customer 500")).toBeVisible();
    expect(
      screen.getAllByText(/deliberately long delivery instruction/i).length,
    ).toBeGreaterThan(1);
    expect(container.querySelector(".overflow-safe")).toBeInTheDocument();
  }, 15_000);

  it("shows a clear empty state instead of an empty table", () => {
    render(
      <DataTableShell
        columns={columns}
        data={[]}
        getRowId={(row) => row.id}
        emptyTitle="No customers found"
        emptyDescription="Try changing the filters."
      />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("No customers found")).toBeVisible();
    expect(screen.getByText("Try changing the filters.")).toBeVisible();
  });

  it("does not expose stale records while loading", () => {
    render(
      <DataTableShell
        columns={columns}
        data={buildRows(10)}
        getRowId={(row) => row.id}
        isLoading
        loadingState={<p role="status">Loading records</p>}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading records");
    expect(screen.queryByText("Customer 1")).not.toBeInTheDocument();
  });
});
