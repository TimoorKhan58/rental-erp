import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockHeaders = vi.fn();
const mockEnsureActiveErpUser = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

vi.mock("@/shared/infrastructure/auth/resolve-session-user", () => ({
  resolveSessionUser: (session: { user?: { id?: string } } | null) => {
    if (session?.user?.id === undefined) {
      return null;
    }

    return { erpUserId: session.user.id };
  },
}));

vi.mock("@/shared/infrastructure/auth/ensure-active-erp-user", () => ({
  ensureActiveErpUser: (...args: unknown[]) => mockEnsureActiveErpUser(...args),
}));

import { proxy } from "./proxy";

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

describe("proxy session gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it("allows unauthenticated access to public paths", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(createRequest("/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from login", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockEnsureActiveErpUser.mockResolvedValue(undefined);

    const response = await proxy(createRequest("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("redirects unauthenticated users to login with callback", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(createRequest("/dashboard"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=%2Fdashboard");
  });

  it("allows authenticated users on protected routes", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockEnsureActiveErpUser.mockResolvedValue(undefined);

    const response = await proxy(createRequest("/dashboard"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("treats /api/health as public without session", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(createRequest("/api/health/live"));

    expect(response.status).toBe(200);
  });

  it("leaves API auth to route handlers instead of redirecting to HTML login", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(createRequest("/api/customers"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("redirects deactivated users away from protected pages", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockEnsureActiveErpUser.mockRejectedValue(new Error("inactive"));

    const response = await proxy(createRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("does not treat lookalike paths as API routes", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(createRequest("/apiary"));

    expect(response.status).toBe(307);
  });
});

describe("proxy file location", () => {
  it("sits next to the app directory so Next.js loads it (QA-005)", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const srcDir = join(process.cwd(), "src");

    expect(existsSync(join(srcDir, "app"))).toBe(true);
    expect(existsSync(join(srcDir, "proxy.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "proxy.ts"))).toBe(false);
  });
});
