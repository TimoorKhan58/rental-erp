import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: { companySetting: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}));

import { APPLICATION } from "@/constants/application";

import { getOrganizationName } from "./get-organization-name";

describe("getOrganizationName", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("returns the saved company name", async () => {
    findFirst.mockResolvedValue({ companyName: "  MT Service  " });

    await expect(getOrganizationName()).resolves.toBe("MT Service");
  });

  it("falls back to the app name when none is saved", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getOrganizationName()).resolves.toBe(APPLICATION.name);
  });

  it("falls back instead of crashing the login page when the database fails (QA-017)", async () => {
    findFirst.mockRejectedValue(new Error("Connection terminated due to connection timeout"));

    await expect(getOrganizationName()).resolves.toBe(APPLICATION.name);
  });
});
