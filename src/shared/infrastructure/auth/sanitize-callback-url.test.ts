import { describe, expect, it } from "vitest";

import { sanitizeCallbackUrl } from "./sanitize-callback-url";

describe("sanitizeCallbackUrl", () => {
  it("allows safe relative paths", () => {
    expect(sanitizeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/users?tab=active")).toBe("/users?tab=active");
  });

  it("rejects open redirects and protocol-relative tricks", () => {
    expect(sanitizeCallbackUrl("https://evil.example")).toBe("/");
    expect(sanitizeCallbackUrl("//evil.example")).toBe("/");
    expect(sanitizeCallbackUrl("/\\evil.example")).toBe("/");
    expect(sanitizeCallbackUrl("/%2fevil.example")).toBe("/");
    expect(sanitizeCallbackUrl("/%5cevil.example")).toBe("/");
  });

  it("defaults empty or missing values to root", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/");
    expect(sanitizeCallbackUrl("")).toBe("/");
  });
});
