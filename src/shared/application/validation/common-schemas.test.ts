import { describe, expect, it } from "vitest";

import { CreateCustomerSchema } from "@/modules/customer/application/schemas/customer.schemas";
import {
  CreateIdentityUserSchema,
  ResetIdentityUserPasswordSchema,
} from "@/modules/identity/application/schemas/identity-user.schemas";

import { NonEmptyStringSchema } from "./common-schemas";

describe("NonEmptyStringSchema (QA-006)", () => {
  it("rejects whitespace-only text", () => {
    expect(NonEmptyStringSchema.safeParse("   ").success).toBe(false);
    expect(NonEmptyStringSchema.safeParse("\t\n").success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    expect(NonEmptyStringSchema.parse("  Ali Tents  ")).toBe("Ali Tents");
  });

  it("applies max length to the trimmed value", () => {
    expect(NonEmptyStringSchema.max(3).safeParse("  abc  ").success).toBe(true);
  });

  it("makes a blank customer name a validation error, not a server error", () => {
    const result = CreateCustomerSchema.safeParse({
      name: "   ",
      phone: "03001234567",
      address: "Main Road",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["name"]);
    expect(result.error?.issues[0]?.message).toBe("This field is required");
  });
});

describe("password fields keep their exact value", () => {
  const base = { name: "QA", email: "qa@example.test", role: "worker" as const };

  it("does not trim passwords, so login matches what was saved", () => {
    const parsed = CreateIdentityUserSchema.parse({
      ...base,
      password: "  secret pass  ",
    });

    expect(parsed.password).toBe("  secret pass  ");
  });

  it("rejects whitespace-only passwords", () => {
    expect(
      CreateIdentityUserSchema.safeParse({ ...base, password: "          " }).success,
    ).toBe(false);
    expect(
      ResetIdentityUserPasswordSchema.safeParse({ password: "          " }).success,
    ).toBe(false);
  });

  it("still enforces 8 to 128 characters", () => {
    expect(
      ResetIdentityUserPasswordSchema.safeParse({ password: "short" }).success,
    ).toBe(false);
    expect(
      ResetIdentityUserPasswordSchema.safeParse({ password: "x".repeat(129) }).success,
    ).toBe(false);
  });
});
