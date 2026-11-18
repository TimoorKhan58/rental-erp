import { afterEach, describe, expect, it, vi } from "vitest";

import { validatePurchaseDate } from "./asset.rules";

describe("validatePurchaseDate across time zones (SaaS phase 4a)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts today's date for a business ahead of the server (00:30 Karachi on a UTC server)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T19:30:00Z"));
    expect(() => validatePurchaseDate(new Date("2026-11-18T00:00:00Z"))).not.toThrow();
  });

  it("still refuses a date that is in the future everywhere", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T19:30:00Z"));
    expect(() => validatePurchaseDate(new Date("2026-11-20T00:00:00Z"))).toThrow(/future/);
  });
});
