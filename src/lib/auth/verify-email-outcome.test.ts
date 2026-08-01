import { describe, expect, it } from "vitest";
import { resolveVerificationOutcome } from "./verify-email-outcome";

describe("resolveVerificationOutcome", () => {
  it("treats BA success redirect as success", () => {
    expect(resolveVerificationOutcome("success", null)).toBe("success");
  });

  it("treats any error as failure even if status is present", () => {
    expect(resolveVerificationOutcome("success", "TOKEN_EXPIRED")).toBe(
      "failure",
    );
    expect(resolveVerificationOutcome(null, "INVALID_TOKEN")).toBe("failure");
  });

  it("treats direct navigation as neutral", () => {
    expect(resolveVerificationOutcome(null, null)).toBe("neutral");
    expect(resolveVerificationOutcome("", null)).toBe("neutral");
  });
});
