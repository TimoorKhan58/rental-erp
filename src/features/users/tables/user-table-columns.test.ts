import { describe, expect, it } from "vitest";
import { getUserTableColumns } from "./user-table-columns";

describe("getUserTableColumns", () => {
  it("includes required enterprise columns", () => {
    const columns = getUserTableColumns({
      params: {},
      onSort: () => undefined,
      canUpdate: true,
      canDelete: true,
      onToggleStatus: () => undefined,
      onResetPassword: () => undefined,
    });

    expect(columns.map((column) => column.id)).toEqual([
      "name",
      "email",
      "role",
      "isActive",
      "lastLogin",
      "createdAt",
      "actions",
    ]);
  });

  it("still builds columns when actions are unauthorized", () => {
    const columns = getUserTableColumns({
      params: { sortBy: "name", sortOrder: "asc" },
      onSort: () => undefined,
      canUpdate: false,
      canDelete: false,
      currentUserId: "self-id",
      onToggleStatus: () => undefined,
      onResetPassword: () => undefined,
    });

    expect(columns).toHaveLength(7);
    expect(columns.every((column) => typeof column.cell === "function")).toBe(
      true,
    );
  });
});
