import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { DispatchApplicationServices } from "@/modules/dispatch/application/services/dispatch-application-services.interface";

import { runDispatchApiRoute } from "@/modules/dispatch/presentation/http/dispatch-api.route-runner";
import {
  handleCancelDispatch,
  handleCompleteDispatch,
  handleCreateDispatch,
  handleGetDispatchById,
  handleListDispatches,
  handleUpdateDispatch,
} from "@/modules/dispatch/presentation/routes/dispatch-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/dispatch/tests/helpers/api-request.factory";
import {
  DISPATCH_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";

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
    getDispatchById: { execute: vi.fn() },
    listDispatches: { execute: vi.fn() },
    createDispatch: { execute: vi.fn() },
    updateDispatch: { execute: vi.fn() },
    completeDispatch: { execute: vi.fn() },
    cancelDispatch: { execute: vi.fn() },
  };
}

describe("runDispatchApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runDispatchApiRoute({
      request: createMockNextRequest(),
      route: "/api/dispatches",
      httpMethod: "GET",
      permission: PERMISSIONS.dispatches.read,
      resolveServices: () => createMockServices() as unknown as DispatchApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runDispatchApiRoute({
      request: createMockNextRequest(),
      route: "/api/dispatches",
      httpMethod: "POST",
      permission: PERMISSIONS.dispatches.create,
      resolveServices: () => createMockServices() as unknown as DispatchApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runDispatchApiRoute({
      request: createMockNextRequest(),
      route: "/api/dispatches",
      httpMethod: "GET",
      permission: PERMISSIONS.dispatches.read,
      resolveServices: () => createMockServices() as unknown as DispatchApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("dispatch route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("handleListDispatches returns list envelope", async () => {
    const services = createMockServices();
    services.listDispatches.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListDispatches(
      createMockNextRequest(),
      () => services as unknown as DispatchApplicationServices,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it("handleCreateDispatch returns created dispatch", async () => {
    const services = createMockServices();
    services.createDispatch.execute.mockResolvedValue({
      id: DISPATCH_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      readyAt: null,
      dispatchedAt: null,
      completedAt: null,
      items: VALID_CREATE_INPUT.items.map((item, index) => ({
        id: `item-${index}`,
        ...item,
      })),
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateDispatch(
      createMockNextRequest({ method: "POST", json: VALID_CREATE_INPUT }),
      () => services as unknown as DispatchApplicationServices,
    );
    const body = await readJsonResponse<{ data: { dispatchNumber: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.dispatchNumber).toBe("DSP-2026-001");
  });

  it("handleGetDispatchById returns dispatch", async () => {
    const services = createMockServices();
    services.getDispatchById.execute.mockResolvedValue({
      id: DISPATCH_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      readyAt: null,
      dispatchedAt: null,
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleGetDispatchById(
      createMockNextRequest(),
      DISPATCH_ID,
      () => services as unknown as DispatchApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleUpdateDispatch delegates to service", async () => {
    const services = createMockServices();
    services.updateDispatch.execute.mockResolvedValue({
      id: DISPATCH_ID,
      ...VALID_CREATE_INPUT,
      remarks: "Updated",
      status: "DRAFT",
      readyAt: null,
      dispatchedAt: null,
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdateDispatch(
      createMockNextRequest({
        method: "PATCH",
        json: { remarks: "Updated" },
      }),
      DISPATCH_ID,
      () => services as unknown as DispatchApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.updateDispatch.execute).toHaveBeenCalled();
  });

  it("handleCompleteDispatch delegates to service", async () => {
    const services = createMockServices();
    services.completeDispatch.execute.mockResolvedValue({
      id: DISPATCH_ID,
      ...VALID_CREATE_INPUT,
      status: "COMPLETED",
      readyAt: "2026-01-16T10:00:00.000Z",
      dispatchedAt: "2026-01-17T10:00:00.000Z",
      completedAt: "2026-01-18T10:00:00.000Z",
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    });

    const response = await handleCompleteDispatch(
      createMockNextRequest({ method: "POST" }),
      DISPATCH_ID,
      () => services as unknown as DispatchApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleCancelDispatch delegates to service", async () => {
    const services = createMockServices();
    services.cancelDispatch.execute.mockResolvedValue({
      id: DISPATCH_ID,
      ...VALID_CREATE_INPUT,
      status: "CANCELLED",
      readyAt: null,
      dispatchedAt: null,
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCancelDispatch(
      createMockNextRequest({ method: "POST" }),
      DISPATCH_ID,
      () => services as unknown as DispatchApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("returns error envelope when service throws", async () => {
    const services = createMockServices();
    services.getDispatchById.execute.mockRejectedValue(
      new NotFoundError({ message: "Dispatch not found" }),
    );

    const response = await handleGetDispatchById(
      createMockNextRequest(),
      DISPATCH_ID,
      () => services as unknown as DispatchApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });
});

describe("runDispatchApiRoute complete permission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows worker role to complete dispatch", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runDispatchApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/dispatches/1/complete",
      httpMethod: "POST",
      permission: PERMISSIONS.dispatches.complete,
      resolveServices: () => createMockServices() as unknown as DispatchApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to cancel dispatch", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runDispatchApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/dispatches/1/cancel",
      httpMethod: "POST",
      permission: PERMISSIONS.dispatches.cancel,
      resolveServices: () => createMockServices() as unknown as DispatchApplicationServices,
      handler: async () => ({ ok: true, productId: PRODUCT_ID }),
    });

    expect(result.status).toBe(200);
  });
});
