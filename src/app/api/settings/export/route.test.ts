import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { USER_ROLES } from "@/constants/roles";
import {
  mockAuthenticatedActiveUser,
  mockUnauthenticatedUser,
  resetApiAuthMocks,
  TEST_ORGANIZATION_ID,
} from "@/shared/infrastructure/auth/api-auth.test-helpers";

const mocks = vi.hoisted(() => ({ buildBusinessExport: vi.fn(), auditLog: vi.fn() }));

vi.mock("@/lib/auth", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibAuthMockModule(),
);
vi.mock("@/lib/prisma", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibPrismaMockModule(),
);
vi.mock("@/shared/config/env", async () => {
  const { testEnvFixture } = await import("@/shared/config/env.test-fixture");
  return { env: testEnvFixture };
});
vi.mock("@/modules/platform/infrastructure/business-export", () => ({
  buildBusinessExport: mocks.buildBusinessExport,
}));
vi.mock("@/shared/infrastructure/di/shared-deps", () => ({
  createSharedDepsFromExecutionContext: () => ({ auditLogger: { log: mocks.auditLog } }),
}));

import { GET } from "./route";

const request = () => new NextRequest(new URL("http://localhost/api/settings/export"));

describe("GET /api/settings/export (SaaS phase 4b)", () => {
  beforeEach(() => {
    resetApiAuthMocks();
    mocks.buildBusinessExport.mockReset();
    mocks.auditLog.mockReset();
    mocks.buildBusinessExport.mockResolvedValue({
      fileName: "rentcore-mt-service-2026-11-18.zip",
      data: new Uint8Array([80, 75, 5, 6]),
      recordCounts: {},
      totalRecords: 42,
    });
  });

  it("gives an owner their business's zip and records it in the audit log", async () => {
    mockAuthenticatedActiveUser(USER_ROLES.OWNER);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("rentcore-mt-service-2026-11-18.zip");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.buildBusinessExport).toHaveBeenCalledWith(expect.anything(), TEST_ORGANIZATION_ID);
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EXPORT", recordId: TEST_ORGANIZATION_ID }),
    );
  });

  it("refuses managers and other non-owners", async () => {
    mockAuthenticatedActiveUser(USER_ROLES.MANAGER);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.buildBusinessExport).not.toHaveBeenCalled();
  });

  it("refuses signed-out visitors", async () => {
    mockUnauthenticatedUser();

    expect((await GET(request())).status).toBe(401);
    expect(mocks.buildBusinessExport).not.toHaveBeenCalled();
  });
});
