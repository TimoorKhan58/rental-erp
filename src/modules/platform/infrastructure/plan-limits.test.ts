import { describe, expect, it } from "vitest";

import { SetBusinessPlanSchema } from "../application/platform-business.schemas";

import { assertWithinPlanLimit, exceedsPlanLimit, planLimitMessage } from "./plan-limits";

describe("plan limits (SaaS phase 4c)", () => {
  it("allows anything without a limit and up to the limit with one", () => {
    expect(exceedsPlanLimit(null, 500)).toBe(false);
    expect(exceedsPlanLimit(3, 2)).toBe(false);
    expect(exceedsPlanLimit(3, 3)).toBe(true);
  });

  it("explains the limit in plain words", () => {
    expect(planLimitMessage("users", 3)).toBe(
      "Your plan allows up to 3 active users. Deactivate one first, or ask RentCore to raise your limit.",
    );
    expect(planLimitMessage("warehouses", 1)).toContain("up to 1 active warehouse.");
  });

  it("does nothing without a business (bootstrap script, platform code)", async () => {
    await expect(assertWithinPlanLimit("users")).resolves.toBeUndefined();
  });

  it("accepts limits from 1, empty for no limit, and a blank plan name", () => {
    expect(SetBusinessPlanSchema.parse({ planName: " Pilot ", maxUsers: 5, maxWarehouses: null })).toEqual({
      planName: "Pilot",
      maxUsers: 5,
      maxWarehouses: null,
    });
    expect(SetBusinessPlanSchema.parse({ planName: "", maxUsers: null, maxWarehouses: null }).planName).toBeNull();
    expect(SetBusinessPlanSchema.safeParse({ planName: null, maxUsers: 0, maxWarehouses: null }).success).toBe(false);
    expect(SetBusinessPlanSchema.safeParse({ planName: null, maxUsers: 2.5, maxWarehouses: null }).success).toBe(false);
  });
});
