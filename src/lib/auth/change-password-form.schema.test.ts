import { describe, expect, it } from "vitest";
import { createChangePasswordSchema } from "./change-password-form.schema";

describe("createChangePasswordSchema", () => {
  const schema = createChangePasswordSchema(8);

  it("accepts a valid current/new/confirm set", () => {
    const result = schema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });

    expect(result.success).toBe(true);
  });

  it("requires the current password", () => {
    const result = schema.safeParse({
      currentPassword: "",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects new passwords shorter than the minimum", () => {
    const result = schema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const result = schema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword1",
      confirmPassword: "newpassword2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "confirmPassword"),
      ).toBe(true);
    }
  });
});
