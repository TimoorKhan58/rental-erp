import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataPagination } from "./data-pagination";

describe("DataPagination UX with hundreds of records", () => {
  it("keeps pagination concise and keyboard operable for 1,000 records", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <DataPagination
        meta={{ page: 25, pageSize: 20, total: 1_000, totalPages: 50 }}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText(/1000/)).toBeVisible();
    expect(screen.getAllByText("More pages")).toHaveLength(2);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(24);

    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(onPageChange).toHaveBeenCalledWith(26);
  });

  it("disables previous navigation on the first page", () => {
    render(
      <DataPagination
        meta={{ page: 1, pageSize: 20, total: 500, totalPages: 25 }}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Go to previous page" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
