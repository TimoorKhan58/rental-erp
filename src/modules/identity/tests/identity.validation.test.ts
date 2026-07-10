import { describe, expect, it } from "vitest";

import {
  CreateIdentityUserSchema,
  ResetIdentityUserPasswordSchema,
  UpdateIdentityUserSchema,
} from "@/modules/identity/application/schemas/identity-user.schemas";
import { ListIdentityUsersSchema } from "@/modules/identity/application/schemas/list-identity-users.schema";
import { USER_ROLES } from "@/constants/roles";

describe("CreateIdentityUserSchema", () => {
  it("accepts valid input", () => {
    const result = CreateIdentityUserSchema.safeParse({
      name: "Jane Admin",
      email: "jane@example.com",
      password: "password123",
      role: USER_ROLES.MANAGER,
    });

    expect(result.success).toBe(true);
  });

  it("rejects short passwords", () => {
    const result = CreateIdentityUserSchema.safeParse({
      name: "Jane Admin",
      email: "jane@example.com",
      password: "short",
      role: USER_ROLES.MANAGER,
    });

    expect(result.success).toBe(false);
  });
});

describe("UpdateIdentityUserSchema", () => {
  it("requires at least one field", () => {
    const result = UpdateIdentityUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts role updates", () => {
    const result = UpdateIdentityUserSchema.safeParse({
      role: USER_ROLES.VIEWER,
    });

    expect(result.success).toBe(true);
  });
});

describe("ResetIdentityUserPasswordSchema", () => {
  it("requires minimum password length", () => {
    const result = ResetIdentityUserPasswordSchema.safeParse({
      password: "1234567",
    });

    expect(result.success).toBe(false);
  });
});

describe("ListIdentityUsersSchema", () => {
  it("rejects oversized search terms", () => {
    const result = ListIdentityUsersSchema.safeParse({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      search: "a".repeat(201),
    });

    expect(result.success).toBe(false);
  });
});
