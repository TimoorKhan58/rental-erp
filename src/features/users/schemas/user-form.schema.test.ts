import { describe, expect, it } from "vitest";
import {
  createUserFormSchema,
  resetPasswordFormSchema,
  updateUserFormSchema,
} from "./user-form.schema";

describe("user form schemas", () => {
  it("accepts a valid create payload without a password", () => {
    const result = createUserFormSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "manager",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid emails on create", () => {
    const result = createUserFormSchema.safeParse({
      name: "Ada",
      email: "not-an-email",
      role: "viewer",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid roles on update", () => {
    const result = updateUserFormSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      role: "superadmin",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("requires matching confirmation on password reset", () => {
    const mismatch = resetPasswordFormSchema.safeParse({
      password: "Secret123!",
      confirmPassword: "Different123!",
    });
    const match = resetPasswordFormSchema.safeParse({
      password: "Secret123!",
      confirmPassword: "Secret123!",
    });

    expect(mismatch.success).toBe(false);
    expect(match.success).toBe(true);
  });
});
