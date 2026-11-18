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

const mockFindActivePlatformOwner = vi.fn();
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/modules/platform/infrastructure/platform-owner.repository", () => ({
  findActivePlatformOwner: (...args: unknown[]) => mockFindActivePlatformOwner(...args),
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
    mockEnsureActiveErpUser.mockResolvedValue({ organizationId: "org-1", mustChangePassword: false });

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
    mockEnsureActiveErpUser.mockResolvedValue({ organizationId: "org-1", mustChangePassword: false });

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

describe("proxy and platform owners (SaaS phase 3b)", () => {
  // A platform owner's session has no ERP user (the mock resolves it to null).
  const platformSession = { user: {} };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it("lets a platform owner open /platform", async () => {
    mockGetSession.mockResolvedValue(platformSession);
    mockFindActivePlatformOwner.mockResolvedValue({ id: "po-1" });

    const response = await proxy(createRequest("/platform"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a platform owner from the business app and login to /platform", async () => {
    mockGetSession.mockResolvedValue(platformSession);
    mockFindActivePlatformOwner.mockResolvedValue({ id: "po-1" });

    for (const path of ["/dashboard", "/customers", "/login", "/"]) {
      const response = await proxy(createRequest(path));
      expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/platform");
    }
  });

  it("treats a login with no ERP user and no platform owner as signed out", async () => {
    mockGetSession.mockResolvedValue(platformSession);
    mockFindActivePlatformOwner.mockResolvedValue(null);

    const response = await proxy(createRequest("/platform"));

    expect(response.headers.get("location")).toContain("/login");
  });

  it("lets business users reach /platform only to get the page's own not-found", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockEnsureActiveErpUser.mockResolvedValue({ organizationId: "org-1", mustChangePassword: false });

    const response = await proxy(createRequest("/platform"));

    expect(response.headers.get("location")).toBeNull();
    expect(mockFindActivePlatformOwner).not.toHaveBeenCalled();
  });
});

describe("proxy and temporary passwords (SaaS phase 3c)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it("sends a user with a temporary password to /change-password", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockEnsureActiveErpUser.mockResolvedValue({ organizationId: "org-1", mustChangePassword: true });

    const response = await proxy(createRequest("/dashboard"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/change-password");

    const onPage = await proxy(createRequest("/change-password"));
    expect(onPage.headers.get("location")).toBeNull();
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
