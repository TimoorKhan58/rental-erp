import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { ReturnApplicationServices } from "@/modules/return/application/services/return-application-services.interface";

import { runReturnApiRoute } from "@/modules/return/presentation/http/return-api.route-runner";
import {
  handleCancelReturn,
  handleCompleteReturn,
  handleCreateReturn,
  handleGetReturnById,
  handleInspectReturn,
  handleListReturns,
  handleReceiveReturn,
  handleUpdateReturn,
} from "@/modules/return/presentation/routes/return-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/return/tests/helpers/api-request.factory";
import {
  ITEM_ID,
  RETURN_ID,
  VALID_CREATE_INPUT,
} from "@/modules/return/tests/helpers/return.fixtures";

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
    getReturnById: { execute: vi.fn() },
    listReturns: { execute: vi.fn() },
    createReturn: { execute: vi.fn() },
    updateReturn: { execute: vi.fn() },
    receiveReturn: { execute: vi.fn() },
    inspectReturn: { execute: vi.fn() },
    completeReturn: { execute: vi.fn() },
    cancelReturn: { execute: vi.fn() },
  };
}

describe("runReturnApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runReturnApiRoute({
      request: createMockNextRequest(),
      route: "/api/returns",
      httpMethod: "GET",
      permission: PERMISSIONS.returns.read,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runReturnApiRoute({
      request: createMockNextRequest(),
      route: "/api/returns",
      httpMethod: "POST",
      permission: PERMISSIONS.returns.create,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runReturnApiRoute({
      request: createMockNextRequest(),
      route: "/api/returns",
      httpMethod: "GET",
      permission: PERMISSIONS.returns.read,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("return route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("handleListReturns returns list envelope", async () => {
    const services = createMockServices();
    services.listReturns.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListReturns(
      createMockNextRequest(),
      () => services as unknown as ReturnApplicationServices,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it("handleCreateReturn returns created return", async () => {
    const services = createMockServices();
    services.createReturn.execute.mockResolvedValue({
      id: RETURN_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      receivedAt: null,
      inspectedAt: null,
      completedAt: null,
      items: VALID_CREATE_INPUT.items.map((item, index) => ({
        id: `item-${index}`,
        ...item,
        returnedQuantity: item.quantity,
        goodQuantity: 0,
        damagedQuantity: 0,
        lostQuantity: 0,
      })),
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateReturn(
      createMockNextRequest({ method: "POST", json: VALID_CREATE_INPUT }),
      () => services as unknown as ReturnApplicationServices,
    );
    const body = await readJsonResponse<{ data: { returnNumber: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.returnNumber).toBe("RTN-2026-001");
  });

  it("handleGetReturnById returns return", async () => {
    const services = createMockServices();
    services.getReturnById.execute.mockResolvedValue({
      id: RETURN_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      receivedAt: null,
      inspectedAt: null,
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleGetReturnById(
      createMockNextRequest(),
      RETURN_ID,
      () => services as unknown as ReturnApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleUpdateReturn delegates to service", async () => {
    const services = createMockServices();
    services.updateReturn.execute.mockResolvedValue({
      id: RETURN_ID,
      ...VALID_CREATE_INPUT,
      remarks: "Updated",
      status: "DRAFT",
      receivedAt: null,
      inspectedAt: null,
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdateReturn(
      createMockNextRequest({
        method: "PATCH",
        json: { remarks: "Updated" },
      }),
      RETURN_ID,
      () => services as unknown as ReturnApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.updateReturn.execute).toHaveBeenCalled();
  });

  it("handleReceiveReturn delegates to service", async () => {
    const services = createMockServices();
    services.receiveReturn.execute.mockResolvedValue({
      id: RETURN_ID,
      ...VALID_CREATE_INPUT,
      status: "RECEIVED",
      receivedAt: "2026-01-18T10:00:00.000Z",
      inspectedAt: null,
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    });

    const response = await handleReceiveReturn(
      createMockNextRequest({ method: "POST" }),
      RETURN_ID,
      () => services as unknown as ReturnApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleInspectReturn delegates to service", async () => {
    const services = createMockServices();
    services.inspectReturn.execute.mockResolvedValue({
      id: RETURN_ID,
      ...VALID_CREATE_INPUT,
      status: "INSPECTED",
      receivedAt: "2026-01-18T10:00:00.000Z",
      inspectedAt: "2026-01-19T10:00:00.000Z",
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-19T10:00:00.000Z",
    });

    const response = await handleInspectReturn(
      createMockNextRequest({
        method: "POST",
        json: {
          items: [
            {
              rentalOrderItemId: ITEM_ID,
              goodQuantity: 3,
              damagedQuantity: 1,
              lostQuantity: 1,
            },
          ],
        },
      }),
      RETURN_ID,
      () => services as unknown as ReturnApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.inspectReturn.execute).toHaveBeenCalled();
  });

  it("handleCompleteReturn delegates to service", async () => {
    const services = createMockServices();
    services.completeReturn.execute.mockResolvedValue({
      id: RETURN_ID,
      ...VALID_CREATE_INPUT,
      status: "COMPLETED",
      receivedAt: "2026-01-18T10:00:00.000Z",
      inspectedAt: "2026-01-19T10:00:00.000Z",
      completedAt: "2026-01-20T10:00:00.000Z",
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });

    const response = await handleCompleteReturn(
      createMockNextRequest({ method: "POST" }),
      RETURN_ID,
      () => services as unknown as ReturnApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleCancelReturn delegates to service", async () => {
    const services = createMockServices();
    services.cancelReturn.execute.mockResolvedValue({
      id: RETURN_ID,
      ...VALID_CREATE_INPUT,
      status: "CANCELLED",
      receivedAt: null,
      inspectedAt: null,
      completedAt: null,
      items: [],
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCancelReturn(
      createMockNextRequest({ method: "POST" }),
      RETURN_ID,
      () => services as unknown as ReturnApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("returns error envelope when service throws", async () => {
    const services = createMockServices();
    services.getReturnById.execute.mockRejectedValue(
      new NotFoundError({ message: "Return not found" }),
    );

    const response = await handleGetReturnById(
      createMockNextRequest(),
      RETURN_ID,
      () => services as unknown as ReturnApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });
});

describe("runReturnApiRoute returns permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows worker role to receive return", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runReturnApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/returns/1/receive",
      httpMethod: "POST",
      permission: PERMISSIONS.returns.receive,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to inspect return", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runReturnApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/returns/1/inspect",
      httpMethod: "POST",
      permission: PERMISSIONS.returns.inspect,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to complete return", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runReturnApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/returns/1/complete",
      httpMethod: "POST",
      permission: PERMISSIONS.returns.complete,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows worker role to cancel return", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runReturnApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/returns/1/cancel",
      httpMethod: "POST",
      permission: PERMISSIONS.returns.cancel,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true, rentalOrderItemId: ITEM_ID }),
    });

    expect(result.status).toBe(200);
  });

  it("denies viewer role from creating return", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runReturnApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/returns",
      httpMethod: "POST",
      permission: PERMISSIONS.returns.create,
      resolveServices: () => createMockServices() as unknown as ReturnApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });
});
