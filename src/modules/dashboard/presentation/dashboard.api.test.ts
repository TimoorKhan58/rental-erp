import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockSession,
  mockUnauthenticatedUser,
} from "@/shared/infrastructure/auth/api-auth.test-helpers";

vi.mock("@/lib/auth", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibAuthMockModule(),
);

vi.mock("@/lib/prisma", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibPrismaMockModule(),
);

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { createMockNextRequest } from "@/modules/dispatch/tests/helpers/api-request.factory";
import type { DashboardApplicationServices } from "@/modules/dashboard/application/services/dashboard-application-services.interface";
import { runDashboardApiRoute } from "@/modules/dashboard/presentation/http/dashboard-api.route-runner";
import { handleGetDashboardLayout } from "@/modules/dashboard/presentation/routes/dashboard-api.routes";

function createMockServices() {
  return {
    dashboardService: {
      getLayout: vi.fn(),
      createLayout: vi.fn(),
      updateLayout: vi.fn(),
      resetLayout: vi.fn(),
    },
  };
}

describe("runDashboardApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    mockUnauthenticatedUser();

    const result = await runDashboardApiRoute({
      request: createMockNextRequest(),
      route: "/api/dashboard/layout",
      httpMethod: "GET",
      permission: PERMISSIONS.dashboard.read,
      resolveServices: () =>
        createMockServices() as unknown as DashboardApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when required permission is missing", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runDashboardApiRoute({
      request: createMockNextRequest(),
      route: "/api/dashboard/layout",
      httpMethod: "GET",
      permission: PERMISSIONS.reports.read,
      resolveServices: () =>
        createMockServices() as unknown as DashboardApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });
});

describe("handleGetDashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns layout payload for authorized user", async () => {
    mockSession(USER_ROLES.OWNER);
    const services = createMockServices();
    services.dashboardService.getLayout.mockResolvedValue({
      id: "layout-1",
      userId: "user-1",
      dashboardId: "dash-1",
      dashboardCode: "overview",
      isCustomized: false,
      layout: {
        version: 1,
        theme: "light",
        collapsedSections: [],
        widgets: [],
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const response = await handleGetDashboardLayout(
      createMockNextRequest({ url: "http://localhost/api/dashboard/layout" }),
      () => services as unknown as DashboardApplicationServices,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { dashboardCode: string } };
    expect(body.data.dashboardCode).toBe("overview");
  });
});
