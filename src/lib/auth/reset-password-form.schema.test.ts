import { describe, expect, it } from "vitest";
import { createSelfServiceResetPasswordSchema } from "./reset-password-form.schema";

describe("createSelfServiceResetPasswordSchema", () => {
  const schema = createSelfServiceResetPasswordSchema(8);

  it("accepts matching passwords that meet the minimum length", () => {
    const result = schema.safeParse({
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects passwords shorter than the configured minimum", () => {
    const result = schema.safeParse({
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const result = schema.safeParse({
      password: "password123",
      confirmPassword: "password456",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "confirmPassword")).toBe(
        true,
      );
    }
  });
});
