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
import type { NotificationApplicationServices } from "@/modules/notification/application/services/notification-application-services.interface";
import { runNotificationApiRoute } from "@/modules/notification/presentation/http/notification-api.route-runner";

function createMockServices() {
  return {
    notificationService: {
      list: vi.fn(),
      getById: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    },
  };
}

describe("runNotificationApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    mockUnauthenticatedUser();

    const result = await runNotificationApiRoute({
      request: createMockNextRequest(),
      route: "/api/notifications",
      httpMethod: "GET",
      permission: PERMISSIONS.notifications.read,
      resolveServices: () =>
        createMockServices() as unknown as NotificationApplicationServices,
      handler: async () => ({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("allows authenticated user with notifications read permission", async () => {
    mockSession(USER_ROLES.MANAGER);
    const services = createMockServices();
    services.notificationService.list.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runNotificationApiRoute({
      request: createMockNextRequest(),
      route: "/api/notifications",
      httpMethod: "GET",
      permission: PERMISSIONS.notifications.read,
      resolveServices: () =>
        services as unknown as NotificationApplicationServices,
      handler: async (_ctx, svc) =>
        svc.notificationService.list({ page: 1, pageSize: 20 }, _ctx),
    });

    expect(result.status).toBe(200);
  });
});
