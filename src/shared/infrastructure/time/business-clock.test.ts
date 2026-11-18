import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ default: { companySetting: { findFirst } } }));

import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { forgetBusinessTimeZone, getBusinessTimeZone, getBusinessToday } from "./business-clock";

const ORG = "00000000-0000-4000-8000-0000000000c1";

describe("business clock (SaaS phase 4a)", () => {
  beforeEach(() => {
    findFirst.mockReset();
    forgetBusinessTimeZone(ORG);
  });

  it("uses the business's saved time zone", async () => {
    findFirst.mockResolvedValue({ timezone: "Asia/Karachi" });
    const today = await runInOrganization(ORG, () => getBusinessToday(new Date("2026-11-17T19:30:00Z")));
    expect(today).toEqual(new Date("2026-11-18T00:00:00Z"));
  });

  it("remembers it, and forgets it after a settings change", async () => {
    findFirst.mockResolvedValue({ timezone: "Asia/Karachi" });
    await runInOrganization(ORG, getBusinessTimeZone);
    await runInOrganization(ORG, getBusinessTimeZone);
    expect(findFirst).toHaveBeenCalledTimes(1);

    forgetBusinessTimeZone(ORG);
    findFirst.mockResolvedValue({ timezone: "Asia/Dubai" });
    await expect(runInOrganization(ORG, getBusinessTimeZone)).resolves.toBe("Asia/Dubai");
  });

  it("falls back to the application default without a business or with a bad value", async () => {
    await expect(getBusinessTimeZone()).resolves.toBe("UTC");
    expect(findFirst).not.toHaveBeenCalled();

    findFirst.mockResolvedValue({ timezone: "Not/AZone" });
    await expect(runInOrganization(ORG, getBusinessTimeZone)).resolves.toBe("UTC");
  });
});
