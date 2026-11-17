import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findUniqueUserMock,
  mockAuthenticatedActiveUser,
  resetApiAuthMocks,
  TEST_ORGANIZATION_ID,
} from "@/shared/infrastructure/auth/api-auth.test-helpers";

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

import { getOrganizationScope } from "@/shared/infrastructure/tenancy/organization-scope";

import { authenticateApiRequest, runInRequestOrganization } from "./authenticate-api-request";

const OTHER_ORGANIZATION_ID = "00000000-0000-4000-8000-0000000000bb";

function request(headers: Record<string, string> = {}) {
  return new NextRequest(new URL("http://localhost/api/customers"), { headers });
}

describe("authenticateApiRequest organization scope (SaaS phase 2)", () => {
  beforeEach(() => {
    resetApiAuthMocks();
  });

  it("limits the rest of the request to the signed-in user's business", async () => {
    mockAuthenticatedActiveUser();

    const { ctx } = await authenticateApiRequest(request(), "/api/customers", "GET");

    expect(ctx.request.tenantId).toBe(TEST_ORGANIZATION_ID);
    const inside = await runInRequestOrganization(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return getOrganizationScope();
    });
    expect(inside).toEqual({ kind: "organization", organizationId: TEST_ORGANIZATION_ID });
    // Outside the request's work there is no business at all (fail closed).
    expect(getOrganizationScope()).toBeUndefined();
  });

  it("ignores a business chosen through the x-tenant-id header", async () => {
    mockAuthenticatedActiveUser();

    const { ctx } = await authenticateApiRequest(
      request({ "x-tenant-id": OTHER_ORGANIZATION_ID }),
      "/api/customers",
      "GET",
    );

    expect(ctx.request.tenantId).toBe(TEST_ORGANIZATION_ID);
    await runInRequestOrganization(ctx, async () => {
      expect(getOrganizationScope()).toMatchObject({ organizationId: TEST_ORGANIZATION_ID });
    });
  });

  it("refuses users whose business is deactivated", async () => {
    mockAuthenticatedActiveUser();
    findUniqueUserMock.mockResolvedValue({
      isActive: true,
      organizationId: TEST_ORGANIZATION_ID,
      organization: { isActive: false },
    });

    await expect(
      authenticateApiRequest(request(), "/api/customers", "GET"),
    ).rejects.toMatchObject({ message: "This business account is inactive" });
  });

  it("keeps two simultaneous requests for different businesses apart", async () => {
    mockAuthenticatedActiveUser();
    findUniqueUserMock
      .mockResolvedValueOnce({ isActive: true, organizationId: TEST_ORGANIZATION_ID, organization: { isActive: true } })
      .mockResolvedValueOnce({ isActive: true, organizationId: OTHER_ORGANIZATION_ID, organization: { isActive: true } });

    const seen = await Promise.all(
      [0, 1].map(async () => {
        const { ctx } = await authenticateApiRequest(request(), "/api/customers", "GET");
        return runInRequestOrganization(ctx, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          const scope = getOrganizationScope();
          return scope?.kind === "organization" ? scope.organizationId : undefined;
        });
      }),
    );

    expect(seen.sort()).toEqual([TEST_ORGANIZATION_ID, OTHER_ORGANIZATION_ID].sort());
  });
});
