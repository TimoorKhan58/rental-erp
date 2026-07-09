import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { RepairApplicationServices } from "@/modules/repair/application/services/repair-application-services.interface";

import { runRepairApiRoute } from "@/modules/repair/presentation/http/repair-api.route-runner";
import {
  createMockNextRequest,
} from "@/modules/dispatch/tests/helpers/api-request.factory";
import {
  REPAIR_ID,
  VALID_CREATE_INPUT,
} from "@/modules/repair/tests/helpers/repair.fixtures";

const getSessionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

function mockSession(role: string) {
  getSessionMock.mockResolvedValue({
    user: {
      id: "user-1",
      role,
      name: "Test User",
      email: "test@example.com",
    },
    session: {
      id: "session-1",
      expiresAt: new Date(),
    },
  });
}

function createMockServices() {
  return {
    getRepairById: { execute: vi.fn() },
    listRepairs: { execute: vi.fn() },
    createRepair: { execute: vi.fn() },
    updateRepair: { execute: vi.fn() },
    startRepair: { execute: vi.fn() },
    completeRepair: { execute: vi.fn() },
    cancelRepair: { execute: vi.fn() },
  };
}

describe("runRepairApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runRepairApiRoute({
      request: createMockNextRequest(),
      route: "/api/repairs",
      httpMethod: "GET",
      permission: PERMISSIONS.repairs.read,
      resolveServices: () => createMockServices() as unknown as RepairApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runRepairApiRoute({
      request: createMockNextRequest(),
      route: "/api/repairs",
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.create,
      resolveServices: () => createMockServices() as unknown as RepairApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runRepairApiRoute({
      request: createMockNextRequest(),
      route: "/api/repairs",
      httpMethod: "GET",
      permission: PERMISSIONS.repairs.read,
      resolveServices: () => createMockServices() as unknown as RepairApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("repair route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("list handler returns list envelope", async () => {
    const services = createMockServices();
    services.listRepairs.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runRepairApiRoute({
      request: createMockNextRequest(),
      route: "/api/repairs",
      httpMethod: "GET",
      permission: PERMISSIONS.repairs.read,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) => svc.listRepairs.execute({ page: 1, pageSize: 20, sortOrder: "desc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { items: [] },
    });
  });

  it("create handler returns created repair", async () => {
    const services = createMockServices();
    services.createRepair.execute.mockResolvedValue({
      id: REPAIR_ID,
      ...VALID_CREATE_INPUT,
      status: "PENDING",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST", json: VALID_CREATE_INPUT }),
      route: "/api/repairs",
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.create,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) => svc.createRepair.execute(VALID_CREATE_INPUT as never),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { repairNumber: "RPR-2026-001" },
    });
  });

  it("getById handler returns repair", async () => {
    const services = createMockServices();
    services.getRepairById.execute.mockResolvedValue({
      id: REPAIR_ID,
      ...VALID_CREATE_INPUT,
      status: "PENDING",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runRepairApiRoute({
      request: createMockNextRequest(),
      route: `/api/repairs/${REPAIR_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.repairs.read,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) => svc.getRepairById.execute({ id: REPAIR_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.getRepairById.execute).toHaveBeenCalledWith({ id: REPAIR_ID });
  });

  it("update handler delegates to service", async () => {
    const services = createMockServices();
    services.updateRepair.execute.mockResolvedValue({
      id: REPAIR_ID,
      ...VALID_CREATE_INPUT,
      repairNotes: "Updated",
      status: "PENDING",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runRepairApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { repairNotes: "Updated" },
      }),
      route: `/api/repairs/${REPAIR_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.repairs.update,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) =>
        svc.updateRepair.execute({ id: REPAIR_ID }, { repairNotes: "Updated" }),
    });

    expect(result.status).toBe(200);
    expect(services.updateRepair.execute).toHaveBeenCalled();
  });

  it("start handler delegates to service", async () => {
    const services = createMockServices();
    services.startRepair.execute.mockResolvedValue({
      id: REPAIR_ID,
      ...VALID_CREATE_INPUT,
      status: "IN_PROGRESS",
      startedAt: "2026-01-18T10:00:00.000Z",
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    });

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/repairs/${REPAIR_ID}/start`,
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.start,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) => svc.startRepair.execute({ id: REPAIR_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.startRepair.execute).toHaveBeenCalled();
  });

  it("complete handler delegates to service", async () => {
    const services = createMockServices();
    services.completeRepair.execute.mockResolvedValue({
      id: REPAIR_ID,
      ...VALID_CREATE_INPUT,
      status: "COMPLETED",
      startedAt: "2026-01-18T10:00:00.000Z",
      completedAt: "2026-01-20T10:00:00.000Z",
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/repairs/${REPAIR_ID}/complete`,
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.complete,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) => svc.completeRepair.execute({ id: REPAIR_ID }),
    });

    expect(result.status).toBe(200);
  });

  it("cancel handler delegates to service", async () => {
    const services = createMockServices();
    services.cancelRepair.execute.mockResolvedValue({
      id: REPAIR_ID,
      ...VALID_CREATE_INPUT,
      status: "CANCELLED",
      startedAt: null,
      completedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/repairs/${REPAIR_ID}/cancel`,
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.cancel,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) => svc.cancelRepair.execute({ id: REPAIR_ID }),
    });

    expect(result.status).toBe(200);
  });

  it("returns error envelope when service throws", async () => {
    const services = createMockServices();
    services.getRepairById.execute.mockRejectedValue(
      new NotFoundError({ message: "Repair not found" }),
    );

    const result = await runRepairApiRoute({
      request: createMockNextRequest(),
      route: `/api/repairs/${REPAIR_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.repairs.read,
      resolveServices: () => services as unknown as RepairApplicationServices,
      handler: async (_ctx, svc) => svc.getRepairById.execute({ id: REPAIR_ID }),
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.NOT_FOUND },
    });
  });
});

describe("runRepairApiRoute repair permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows worker role to start repair", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/repairs/${REPAIR_ID}/start`,
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.start,
      resolveServices: () => createMockServices() as unknown as RepairApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to complete repair", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/repairs/${REPAIR_ID}/complete`,
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.complete,
      resolveServices: () => createMockServices() as unknown as RepairApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to cancel repair", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/repairs/${REPAIR_ID}/cancel`,
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.cancel,
      resolveServices: () => createMockServices() as unknown as RepairApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("denies viewer role from creating repair", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runRepairApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/repairs",
      httpMethod: "POST",
      permission: PERMISSIONS.repairs.create,
      resolveServices: () => createMockServices() as unknown as RepairApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });
});
