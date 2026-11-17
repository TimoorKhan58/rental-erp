import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const countOrganizations = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    companySetting: { findFirst: (...args: unknown[]) => findFirst(...args) },
    organization: { count: (...args: unknown[]) => countOrganizations(...args) },
  },
}));

import { APPLICATION } from "@/constants/application";

import { getOrganizationName } from "./get-organization-name";

describe("getOrganizationName", () => {
  beforeEach(() => {
    findFirst.mockReset();
    countOrganizations.mockReset();
    countOrganizations.mockResolvedValue(1);
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

  it("shows the product name, not a business's, when several businesses share the site", async () => {
    countOrganizations.mockResolvedValue(2);
    findFirst.mockResolvedValue({ companyName: "MT Service" });

    await expect(getOrganizationName()).resolves.toBe(APPLICATION.name);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
