import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import type { UserRole } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import {
  createMockAuthSession,
  TEST_ERP_USER_ID,
} from "@/shared/infrastructure/auth/test-session.factory";
import prisma from "@/lib/prisma";

import { runIdentityApiRoute } from "@/modules/identity/presentation/http/identity-api.route-runner";
import {
  handleCreateIdentityUser,
  handleGetIdentityUserProfile,
  handleListIdentityUsers,
} from "@/modules/identity/presentation/routes/identity-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/identity/tests/helpers/api-request.factory";
import type { IdentityApplicationServices } from "@/modules/identity/application/services/identity-application-services.interface";

const getSessionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

function mockSession(role: UserRole) {
  getSessionMock.mockResolvedValue(createMockAuthSession(role));
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: TEST_ERP_USER_ID,
    isActive: true,
    role: { name: role },
  } as never);
}

import { VALID_CREATE_INPUT } from "@/modules/identity/tests/helpers/identity-user.fixtures";

function createMockServices() {
  return {
    createIdentityUser: { execute: vi.fn() },
    updateIdentityUser: { execute: vi.fn() },
    deactivateIdentityUser: { execute: vi.fn() },
    resetIdentityUserPassword: { execute: vi.fn() },
    getIdentityUserById: { execute: vi.fn() },
    listIdentityUsers: { execute: vi.fn() },
    listRoles: { execute: vi.fn() },
    getIdentityUserPermissions: { execute: vi.fn() },
    getIdentityUserProfile: { execute: vi.fn() },
  };
}

describe("runIdentityApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runIdentityApiRoute({
      request: createMockNextRequest(),
      route: "/api/users",
      httpMethod: "GET",
      permission: PERMISSIONS.identity.read,
      resolveServices: () => createMockServices() as unknown as IdentityApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 401 when ERP user bridge is missing", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "auth-only",
        role: USER_ROLES.OWNER,
        name: "Test",
        email: "test@example.com",
      },
      session: { id: "s1", expiresAt: new Date() },
    });

    const result = await runIdentityApiRoute({
      request: createMockNextRequest(),
      route: "/api/users",
      httpMethod: "GET",
      permission: PERMISSIONS.identity.read,
      resolveServices: () => createMockServices() as unknown as IdentityApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runIdentityApiRoute({
      request: createMockNextRequest(),
      route: "/api/users",
      httpMethod: "POST",
      permission: PERMISSIONS.identity.create,
      resolveServices: () => createMockServices() as unknown as IdentityApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("allows authenticated workers when no permission is required", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runIdentityApiRoute({
      request: createMockNextRequest(),
      route: "/api/users/me",
      httpMethod: "GET",
      resolveServices: () => createMockServices() as unknown as IdentityApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows owner to list users", async () => {
    mockSession(USER_ROLES.OWNER);
    const services = createMockServices();
    services.listIdentityUsers.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runIdentityApiRoute({
      request: createMockNextRequest(),
      route: "/api/users",
      httpMethod: "GET",
      permission: PERMISSIONS.identity.read,
      resolveServices: () => services as unknown as IdentityApplicationServices,
      handler: async (_ctx, resolved) =>
        resolved.listIdentityUsers.execute({
          page: 1,
          pageSize: 20,
          sortOrder: "asc",
        }),
    });

    expect(result.status).toBe(200);
  });
});

describe("identity API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleListIdentityUsers returns paginated response", async () => {
    mockSession(USER_ROLES.OWNER);
    const services = createMockServices();
    services.listIdentityUsers.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListIdentityUsers(
      createMockNextRequest({
        url: "http://localhost:3000/api/users?page=1&pageSize=20&sortOrder=asc",
      }),
      () => services as unknown as IdentityApplicationServices,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it("handleListIdentityUsers forbids Worker without identity.read", async () => {
    mockSession(USER_ROLES.WORKER);
    const services = createMockServices();

    const response = await handleListIdentityUsers(
      createMockNextRequest({
        url: "http://localhost:3000/api/users?page=1&pageSize=20&sortOrder=asc",
      }),
      () => services as unknown as IdentityApplicationServices,
    );

    expect(response.status).toBe(403);
    expect(services.listIdentityUsers.execute).not.toHaveBeenCalled();
  });

  it("rejects invalid create payload", async () => {
    mockSession(USER_ROLES.OWNER);

    await expect(
      handleCreateIdentityUser(
        createMockNextRequest({
          url: "http://localhost:3000/api/users",
          method: "POST",
          json: { name: "x" },
        }),
        () => createMockServices() as unknown as IdentityApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("handleGetIdentityUserProfile uses authenticated ERP user id", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.getIdentityUserProfile.execute.mockResolvedValue({
      id: "10000000-0000-4000-8000-000000000099",
      name: "Test User",
      email: "test@example.com",
      roleId: "00000000-0000-4000-8000-000000000005",
      role: USER_ROLES.VIEWER,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: [],
    });

    const response = await handleGetIdentityUserProfile(
      createMockNextRequest({ url: "http://localhost:3000/api/users/me" }),
      () => services as unknown as IdentityApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.getIdentityUserProfile.execute).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000099",
    );
  });

  it("handleGetIdentityUserProfile allows Worker without identity.read", async () => {
    mockSession(USER_ROLES.WORKER);
    const services = createMockServices();
    services.getIdentityUserProfile.execute.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000099",
      name: "Worker User",
      email: "worker@example.com",
      roleId: "00000000-0000-4000-8000-000000000003",
      role: USER_ROLES.WORKER,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: ["customers:read", "dashboard:read"],
    });

    const response = await handleGetIdentityUserProfile(
      createMockNextRequest({ url: "http://localhost:3000/api/users/me" }),
      () => services as unknown as IdentityApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.getIdentityUserProfile.execute).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000099",
    );
  });

  it("handleCreateIdentityUser delegates to service with valid input", async () => {
    mockSession(USER_ROLES.OWNER);
    const services = createMockServices();
    services.createIdentityUser.execute.mockResolvedValue({
      id: "new-user",
      ...VALID_CREATE_INPUT,
      roleId: "00000000-0000-4000-8000-000000000002",
      invitationDelivered: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = await handleCreateIdentityUser(
      createMockNextRequest({
        url: "http://localhost:3000/api/users",
        method: "POST",
        json: VALID_CREATE_INPUT,
        headers: { "content-type": "application/json" },
      }),
      () => services as unknown as IdentityApplicationServices,
    );

    const body = await readJsonResponse<{
      data: { id: string; invitationDelivered: boolean };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.invitationDelivered).toBe(true);
    expect(services.createIdentityUser.execute).toHaveBeenCalledOnce();
  });
});
