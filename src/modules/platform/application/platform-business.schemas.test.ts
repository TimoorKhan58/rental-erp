import { describe, expect, it } from "vitest";

import { BusinessSlugSchema, CreateBusinessSchema } from "./platform-business.schemas";

const valid = {
  name: "Test Tents",
  slug: "test-tents",
  currencyCode: "pkr",
  currencySymbol: "Rs",
  timezone: "Asia/Karachi",
  owner: { name: "Owner", email: "Owner@Example.com ", temporaryPassword: "temporary-123" },
};

describe("platform business input (SaaS phase 3c)", () => {
  it("normalises a valid business", () => {
    const parsed = CreateBusinessSchema.parse(valid);
    expect(parsed.currencyCode).toBe("PKR");
    expect(parsed.owner.email).toBe("owner@example.com");
  });

  it("rejects unsafe or reserved short names", () => {
    for (const slug of ["ab", "Test Tents", "test--tents", "-test", "platform", "api"]) {
      expect(BusinessSlugSchema.safeParse(slug).success).toBe(false);
    }
    expect(BusinessSlugSchema.parse(" Test-Tents ")).toBe("test-tents");
  });

  it("rejects unknown time zones, bad currency codes and short passwords", () => {
    expect(CreateBusinessSchema.safeParse({ ...valid, timezone: "Mars/Base" }).success).toBe(false);
    expect(CreateBusinessSchema.safeParse({ ...valid, currencyCode: "RUPEES" }).success).toBe(false);
    expect(
      CreateBusinessSchema.safeParse({ ...valid, owner: { ...valid.owner, temporaryPassword: "short" } }).success,
    ).toBe(false);
  });
});
