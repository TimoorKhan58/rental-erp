import { describe, expect, it } from "vitest";

import { localDateInputValue } from "./local-date";

describe("localDateInputValue (SaaS phase 4a)", () => {
  it("formats the local calendar date with zero padding", () => {
    expect(localDateInputValue(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
    expect(localDateInputValue(new Date(2026, 10, 18, 23, 30))).toBe("2026-11-18");
  });
});
