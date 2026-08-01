import { describe, expect, it } from "vitest";
import {
  PUBLIC_API_EXACT_PATHS,
  PUBLIC_API_PATH_PREFIXES,
  PUBLIC_ROUTES,
  ROUTES,
} from "@/config/routes";
import { isProxyPublicPath } from "./proxy-public-path";

describe("isProxyPublicPath", () => {
  it("allows every PUBLIC_ROUTES page", () => {
    for (const route of PUBLIC_ROUTES) {
      expect(isProxyPublicPath(route)).toBe(true);
    }
  });

  it("allows auth and recovery pages used by invitation/reset/verify flows", () => {
    expect(isProxyPublicPath(ROUTES.login)).toBe(true);
    expect(isProxyPublicPath(ROUTES.logout)).toBe(true);
    expect(isProxyPublicPath(ROUTES.forgotPassword)).toBe(true);
    expect(isProxyPublicPath(ROUTES.resetPassword)).toBe(true);
    expect(isProxyPublicPath(ROUTES.verifyEmail)).toBe(true);
    expect(isProxyPublicPath(ROUTES.unauthorized)).toBe(true);
  });

  it("allows Better Auth and health/metrics endpoints via prefix/exact lists", () => {
    expect(isProxyPublicPath("/api/auth/sign-in/email")).toBe(true);
    expect(isProxyPublicPath("/api/auth/reset-password/tok")).toBe(true);
    expect(isProxyPublicPath("/api/auth/verify-email")).toBe(true);
    expect(isProxyPublicPath("/api/health")).toBe(true);
    expect(isProxyPublicPath("/api/health/ready")).toBe(true);
    expect(isProxyPublicPath("/api/metrics")).toBe(true);

    for (const prefix of PUBLIC_API_PATH_PREFIXES) {
      expect(isProxyPublicPath(prefix)).toBe(true);
      expect(isProxyPublicPath(`${prefix}/nested`)).toBe(true);
    }

    for (const exact of PUBLIC_API_EXACT_PATHS) {
      expect(isProxyPublicPath(exact)).toBe(true);
    }
  });

  it("does not treat similar API prefixes as public", () => {
    expect(isProxyPublicPath("/api/authorize")).toBe(false);
    expect(isProxyPublicPath("/api/authentication-extra")).toBe(false);
    expect(isProxyPublicPath("/api/healthcheck")).toBe(false);
    expect(isProxyPublicPath("/api/metrics/extra")).toBe(false);
  });

  it("treats application home and modules as protected", () => {
    expect(isProxyPublicPath(ROUTES.home)).toBe(false);
    expect(isProxyPublicPath(ROUTES.dashboard)).toBe(false);
    expect(isProxyPublicPath(ROUTES.customers)).toBe(false);
    expect(isProxyPublicPath(ROUTES.inventory)).toBe(false);
    expect(isProxyPublicPath(ROUTES.procurements)).toBe(false);
    expect(isProxyPublicPath(ROUTES.reports)).toBe(false);
    expect(isProxyPublicPath(ROUTES.users)).toBe(false);
    expect(isProxyPublicPath(ROUTES.settings)).toBe(false);
    expect(isProxyPublicPath("/api/users")).toBe(false);
  });

  it("keeps PUBLIC_ROUTES free of protected app shells", () => {
    expect(PUBLIC_ROUTES).not.toContain(ROUTES.home);
    expect(PUBLIC_ROUTES).not.toContain(ROUTES.dashboard);
    expect(PUBLIC_ROUTES).toContain(ROUTES.forgotPassword);
    expect(PUBLIC_ROUTES).toContain(ROUTES.resetPassword);
    expect(PUBLIC_ROUTES).toContain(ROUTES.verifyEmail);
  });
});
