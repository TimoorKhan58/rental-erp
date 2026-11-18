import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findActivePlatformOwner: vi.fn(),
  recordPlatformAudit: vi.fn(),
  buildBusinessExport: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/modules/platform/infrastructure/platform-owner.repository", () => ({
  findActivePlatformOwner: mocks.findActivePlatformOwner,
  recordPlatformAudit: mocks.recordPlatformAudit,
}));
vi.mock("@/modules/platform/infrastructure/business-export", () => ({
  buildBusinessExport: mocks.buildBusinessExport,
}));

import { GET } from "./route";

const BUSINESS = "00000000-0000-4000-8000-0000000000b2";
const call = () =>
  GET(new NextRequest(new URL(`http://localhost/api/platform/businesses/${BUSINESS}/export`)), {
    params: Promise.resolve({ id: BUSINESS }),
  });

describe("GET /api/platform/businesses/:id/export (SaaS phase 4b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildBusinessExport.mockResolvedValue({
      fileName: "rentcore-test-tents-b-2026-11-18.zip",
      data: new Uint8Array([80, 75, 5, 6]),
      recordCounts: {},
      totalRecords: 7,
    });
  });

  it("gives a platform owner the business's zip and audits it", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "auth-1" } });
    mocks.findActivePlatformOwner.mockResolvedValue({ id: "po-1", authUserId: "auth-1", email: "p@x", name: "P" });

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("rentcore-test-tents-b-2026-11-18.zip");
    expect(mocks.buildBusinessExport).toHaveBeenCalledWith({}, BUSINESS);
    expect(mocks.recordPlatformAudit).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: "business.exported", targetOrganizationId: BUSINESS }),
    );
  });

  it("answers 404 to everyone else, including business owners", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "auth-business-owner" } });
    mocks.findActivePlatformOwner.mockResolvedValue(null);

    expect((await call()).status).toBe(404);
    expect(mocks.buildBusinessExport).not.toHaveBeenCalled();
  });
});
