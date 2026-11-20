import { describe, expect, it } from "vitest";

import { signInErrorMessage } from "./login-form";

describe("sign-in error messages (QA P3)", () => {
  it("explains a switched-off company", () => {
    expect(signInErrorMessage({ status: 403, message: "This business account is inactive" })).toMatch(
      /company's RentCore account has been switched off/,
    );
  });

  it("explains a switched-off login", () => {
    expect(signInErrorMessage({ status: 403, message: "User account is inactive" })).toMatch(
      /ask your company owner/,
    );
  });

  it("still gives a reason when the server sends none", () => {
    expect(signInErrorMessage({ status: 403 })).toMatch(/switched off/);
    expect(signInErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" })).toBe(
      "Wrong email or password.",
    );
    expect(signInErrorMessage({ status: 429, message: "Too many requests" })).toMatch(/wait a minute/);
  });
});
