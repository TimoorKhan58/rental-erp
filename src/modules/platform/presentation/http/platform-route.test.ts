import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrganizationScope } from "@/shared/infrastructure/tenancy/organization-scope";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findActivePlatformOwner: vi.fn(),
  recordPlatformAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("../../infrastructure/platform-owner.repository", () => ({
  findActivePlatformOwner: mocks.findActivePlatformOwner,
  recordPlatformAudit: mocks.recordPlatformAudit,
}));

import { runPlatformRoute } from "./platform-route";

const OWNER = { id: "po-1", authUserId: "auth-1", email: "owner@rentcore.test", name: "Owner" };

function request(): NextRequest {
  return new NextRequest(new URL("http://localhost/api/platform/session"), {
    headers: { "user-agent": "vitest", "x-forwarded-for": "10.0.0.9" },
  });
}

describe("runPlatformRoute (SaaS phase 3b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("answers 404 when nobody is signed in", async () => {
    mocks.getSession.mockResolvedValue(null);
    const handler = vi.fn();

    const response = await runPlatformRoute(request(), "test", handler);

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 404 to business users, including business owners", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "auth-business" } });
    mocks.findActivePlatformOwner.mockResolvedValue(null);
    const handler = vi.fn();

    const response = await runPlatformRoute(request(), "test", handler);

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler for a platform owner in a named system scope", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "auth-1" } });
    mocks.findActivePlatformOwner.mockResolvedValue(OWNER);

    const response = await runPlatformRoute(request(), "businesses.list", async () => getOrganizationScope());

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: unknown };
    expect(body.data).toEqual({ kind: "system", reason: "platform:businesses.list" });
  });

  it("audits actions with the owner and request details", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "auth-1" } });
    mocks.findActivePlatformOwner.mockResolvedValue(OWNER);

    await runPlatformRoute(request(), "businesses.deactivate", async (ctx) => {
      await ctx.audit({ action: "business.deactivated", targetOrganizationId: "org-9" });
      return null;
    });

    expect(mocks.recordPlatformAudit).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        platformOwnerId: "po-1",
        action: "business.deactivated",
        targetOrganizationId: "org-9",
        userAgent: "vitest",
      }),
    );
  });
});
