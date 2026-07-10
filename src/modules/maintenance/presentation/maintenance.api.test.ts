import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { MaintenanceApplicationServices } from "@/modules/maintenance/application/services/maintenance-application-services.interface";

import { runMaintenanceApiRoute } from "@/modules/maintenance/presentation/http/maintenance-api.route-runner";
import {
  createMockNextRequest,
} from "@/modules/dispatch/tests/helpers/api-request.factory";
import {
  MAINTENANCE_ID,
  VALID_CREATE_INPUT,
} from "@/modules/maintenance/tests/helpers/maintenance.fixtures";

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
}

function createMockServices() {
  return {
    getMaintenanceById: { execute: vi.fn() },
    listMaintenances: { execute: vi.fn() },
    createMaintenance: { execute: vi.fn() },
    updateMaintenance: { execute: vi.fn() },
    startMaintenance: { execute: vi.fn() },
    completeMaintenance: { execute: vi.fn() },
    cancelMaintenance: { execute: vi.fn() },
  };
}

describe("runMaintenanceApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest(),
      route: "/api/maintenances",
      httpMethod: "GET",
      permission: PERMISSIONS.maintenances.read,
      resolveServices: () =>
        createMockServices() as unknown as MaintenanceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest(),
      route: "/api/maintenances",
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.create,
      resolveServices: () =>
        createMockServices() as unknown as MaintenanceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest(),
      route: "/api/maintenances",
      httpMethod: "GET",
      permission: PERMISSIONS.maintenances.read,
      resolveServices: () =>
        createMockServices() as unknown as MaintenanceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("maintenance route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("list handler returns list envelope", async () => {
    const services = createMockServices();
    services.listMaintenances.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest(),
      route: "/api/maintenances",
      httpMethod: "GET",
      permission: PERMISSIONS.maintenances.read,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.listMaintenances.execute({ page: 1, pageSize: 20, sortOrder: "desc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { items: [] },
    });
  });

  it("create handler returns created maintenance", async () => {
    const services = createMockServices();
    services.createMaintenance.execute.mockResolvedValue({
      id: MAINTENANCE_ID,
      ...VALID_CREATE_INPUT,
      status: "SCHEDULED",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_INPUT,
      }),
      route: "/api/maintenances",
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.create,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.createMaintenance.execute(VALID_CREATE_INPUT as never),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { maintenanceNumber: "MNT-2026-001" },
    });
  });

  it("getById handler returns maintenance", async () => {
    const services = createMockServices();
    services.getMaintenanceById.execute.mockResolvedValue({
      id: MAINTENANCE_ID,
      ...VALID_CREATE_INPUT,
      status: "SCHEDULED",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest(),
      route: `/api/maintenances/${MAINTENANCE_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.maintenances.read,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.getMaintenanceById.execute({ id: MAINTENANCE_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.getMaintenanceById.execute).toHaveBeenCalledWith({
      id: MAINTENANCE_ID,
    });
  });

  it("update handler delegates to service", async () => {
    const services = createMockServices();
    services.updateMaintenance.execute.mockResolvedValue({
      id: MAINTENANCE_ID,
      ...VALID_CREATE_INPUT,
      notes: "Updated",
      status: "SCHEDULED",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { notes: "Updated" },
      }),
      route: `/api/maintenances/${MAINTENANCE_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.maintenances.update,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.updateMaintenance.execute({ id: MAINTENANCE_ID }, { notes: "Updated" }),
    });

    expect(result.status).toBe(200);
    expect(services.updateMaintenance.execute).toHaveBeenCalled();
  });

  it("start handler delegates to service", async () => {
    const services = createMockServices();
    services.startMaintenance.execute.mockResolvedValue({
      id: MAINTENANCE_ID,
      ...VALID_CREATE_INPUT,
      status: "IN_PROGRESS",
      startedAt: "2026-01-18T10:00:00.000Z",
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    });

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/maintenances/${MAINTENANCE_ID}/start`,
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.start,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.startMaintenance.execute({ id: MAINTENANCE_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.startMaintenance.execute).toHaveBeenCalled();
  });

  it("complete handler delegates to service", async () => {
    const services = createMockServices();
    services.completeMaintenance.execute.mockResolvedValue({
      id: MAINTENANCE_ID,
      ...VALID_CREATE_INPUT,
      status: "COMPLETED",
      startedAt: "2026-01-18T10:00:00.000Z",
      completedAt: "2026-01-20T10:00:00.000Z",
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/maintenances/${MAINTENANCE_ID}/complete`,
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.complete,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.completeMaintenance.execute({ id: MAINTENANCE_ID }),
    });

    expect(result.status).toBe(200);
  });

  it("cancel handler delegates to service", async () => {
    const services = createMockServices();
    services.cancelMaintenance.execute.mockResolvedValue({
      id: MAINTENANCE_ID,
      ...VALID_CREATE_INPUT,
      status: "CANCELLED",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/maintenances/${MAINTENANCE_ID}/cancel`,
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.cancel,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.cancelMaintenance.execute({ id: MAINTENANCE_ID }),
    });

    expect(result.status).toBe(200);
  });

  it("returns error envelope when service throws", async () => {
    const services = createMockServices();
    services.getMaintenanceById.execute.mockRejectedValue(
      new NotFoundError({ message: "Maintenance not found" }),
    );

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest(),
      route: `/api/maintenances/${MAINTENANCE_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.maintenances.read,
      resolveServices: () =>
        services as unknown as MaintenanceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.getMaintenanceById.execute({ id: MAINTENANCE_ID }),
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.NOT_FOUND },
    });
  });
});

describe("runMaintenanceApiRoute maintenance permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows worker role to start maintenance", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/maintenances/${MAINTENANCE_ID}/start`,
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.start,
      resolveServices: () =>
        createMockServices() as unknown as MaintenanceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to complete maintenance", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/maintenances/${MAINTENANCE_ID}/complete`,
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.complete,
      resolveServices: () =>
        createMockServices() as unknown as MaintenanceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to cancel maintenance", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/maintenances/${MAINTENANCE_ID}/cancel`,
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.cancel,
      resolveServices: () =>
        createMockServices() as unknown as MaintenanceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("denies viewer role from creating maintenance", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runMaintenanceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/maintenances",
      httpMethod: "POST",
      permission: PERMISSIONS.maintenances.create,
      resolveServices: () =>
        createMockServices() as unknown as MaintenanceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });
});
