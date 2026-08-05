import { describe, expect, it } from "vitest";
import {
  createUserFormSchema,
  resetUserPasswordFormSchema,
  updateUserFormSchema,
} from "./user-form.schema";

describe("createUserFormSchema", () => {
  it("accepts a valid create payload", () => {
    const result = createUserFormSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      role: "viewer",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects short passwords", () => {
    const result = createUserFormSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "short",
      role: "viewer",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("updateUserFormSchema", () => {
  it("accepts name, email, and role without status", () => {
    const result = updateUserFormSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "manager",
    });

    expect(result.success).toBe(true);
  });

  it("does not require isActive", () => {
    const result = updateUserFormSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "manager",
      isActive: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("isActive" in result.data).toBe(false);
    }
  });
});

describe("resetUserPasswordFormSchema", () => {
  it("accepts matching passwords", () => {
    const result = resetUserPasswordFormSchema.safeParse({
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = resetUserPasswordFormSchema.safeParse({
      password: "password123",
      confirmPassword: "different99",
    });

    expect(result.success).toBe(false);
  });
});
