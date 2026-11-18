import { describe, expect, it } from "vitest";

import { decidePageAccess, isPlatformPath } from "./page-access";

describe("decidePageAccess (SaaS phase 3b)", () => {
  it("recognises platform paths without matching lookalikes", () => {
    expect(isPlatformPath("/platform")).toBe(true);
    expect(isPlatformPath("/platform/businesses")).toBe(true);
    expect(isPlatformPath("/platformer")).toBe(false);
  });

  it("keeps signed-out visitors on public pages and sends them to login elsewhere", () => {
    expect(decidePageAccess("/login", null)).toEqual({ action: "next" });
    expect(decidePageAccess("/customers", null)).toEqual({
      action: "redirect",
      to: "/login",
      callbackUrl: "/customers",
    });
    expect(decidePageAccess("/platform", null)).toMatchObject({ to: "/login" });
  });

  it("keeps business users in the app", () => {
    expect(decidePageAccess("/customers", "business")).toEqual({ action: "next" });
    expect(decidePageAccess("/login", "business")).toEqual({ action: "redirect", to: "/" });
    // The platform page itself answers not-found for them.
    expect(decidePageAccess("/platform", "business")).toEqual({ action: "next" });
  });

  it("keeps platform owners in the platform area", () => {
    expect(decidePageAccess("/platform", "platform")).toEqual({ action: "next" });
    expect(decidePageAccess("/platform/businesses", "platform")).toEqual({ action: "next" });
    for (const path of ["/", "/login", "/dashboard", "/customers/abc"]) {
      expect(decidePageAccess(path, "platform")).toEqual({ action: "redirect", to: "/platform" });
    }
  });

  it("only allows the dev layout harness in development", () => {
    expect(decidePageAccess("/dev/fluid-grid-qa", null, true)).toEqual({ action: "next" });
    expect(decidePageAccess("/dev/fluid-grid-qa", null, false)).toMatchObject({ to: "/login" });
  });

  it("keeps users with a temporary password on /change-password (SaaS phase 3c)", () => {
    expect(decidePageAccess("/change-password", "business_password_change")).toEqual({ action: "next" });
    for (const path of ["/", "/dashboard", "/customers", "/login", "/platform"]) {
      expect(decidePageAccess(path, "business_password_change")).toEqual({
        action: "redirect",
        to: "/change-password",
      });
    }
    // Normal users may still change their password voluntarily.
    expect(decidePageAccess("/change-password", "business")).toEqual({ action: "next" });
    expect(decidePageAccess("/change-password", null)).toMatchObject({ to: "/login" });
    expect(decidePageAccess("/change-password", "platform")).toEqual({ action: "redirect", to: "/platform" });
  });
});
