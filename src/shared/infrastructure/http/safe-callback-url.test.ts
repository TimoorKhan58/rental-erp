import { describe, expect, it } from "vitest";

import { ROUTES } from "@/config/routes";
import { sanitizeCallbackUrl } from "./safe-callback-url";

describe("sanitizeCallbackUrl", () => {
  it("allows relative app paths", () => {
    expect(sanitizeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/customers/abc")).toBe("/customers/abc");
    expect(sanitizeCallbackUrl("/settings?tab=profile")).toBe(
      "/settings?tab=profile",
    );
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(sanitizeCallbackUrl("https://evil.example")).toBe(ROUTES.dashboard);
    expect(sanitizeCallbackUrl("http://evil.example")).toBe(ROUTES.dashboard);
    expect(sanitizeCallbackUrl("//evil.example")).toBe(ROUTES.dashboard);
    expect(sanitizeCallbackUrl("/\\evil.example")).toBe(ROUTES.dashboard);
  });

  it("falls back for empty or missing values", () => {
    expect(sanitizeCallbackUrl(null)).toBe(ROUTES.dashboard);
    expect(sanitizeCallbackUrl(undefined)).toBe(ROUTES.dashboard);
    expect(sanitizeCallbackUrl("")).toBe(ROUTES.dashboard);
    expect(sanitizeCallbackUrl("   ")).toBe(ROUTES.dashboard);
  });
});
