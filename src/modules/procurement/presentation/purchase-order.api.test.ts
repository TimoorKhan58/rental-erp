import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { PurchaseOrderApplicationServices } from "@/modules/procurement/application/services/purchase-order-application-services.interface";

import { runPurchaseOrderApiRoute } from "@/modules/procurement/presentation/http/purchase-order-api.route-runner";
import {
  handleApprovePurchaseOrder,
  handleCancelPurchaseOrder,
  handleCreatePurchaseOrder,
  handleGetPurchaseOrderById,
  handleListPurchaseOrders,
  handleReceivePurchaseOrder,
  handleUpdatePurchaseOrder,
} from "@/modules/procurement/presentation/routes/purchase-order-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/procurement/tests/helpers/api-request.factory";
import {
  PRODUCT_ID,
  PURCHASE_ORDER_ID,
  VALID_CREATE_INPUT,
} from "@/modules/procurement/tests/helpers/purchase-order.fixtures";

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
    getPurchaseOrderById: { execute: vi.fn() },
    listPurchaseOrders: { execute: vi.fn() },
    createPurchaseOrder: { execute: vi.fn() },
    updatePurchaseOrder: { execute: vi.fn() },
    approvePurchaseOrder: { execute: vi.fn() },
    receivePurchaseOrder: { execute: vi.fn() },
    cancelPurchaseOrder: { execute: vi.fn() },
  };
}

describe("runPurchaseOrderApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runPurchaseOrderApiRoute({
      request: createMockNextRequest(),
      route: "/api/purchase-orders",
      httpMethod: "GET",
      permission: PERMISSIONS.purchaseOrders.read,
      resolveServices: () => createMockServices() as unknown as PurchaseOrderApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runPurchaseOrderApiRoute({
      request: createMockNextRequest(),
      route: "/api/purchase-orders",
      httpMethod: "POST",
      permission: PERMISSIONS.purchaseOrders.create,
      resolveServices: () => createMockServices() as unknown as PurchaseOrderApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runPurchaseOrderApiRoute({
      request: createMockNextRequest(),
      route: "/api/purchase-orders",
      httpMethod: "GET",
      permission: PERMISSIONS.purchaseOrders.read,
      resolveServices: () => createMockServices() as unknown as PurchaseOrderApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("purchase order route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("handleListPurchaseOrders returns list envelope", async () => {
    const services = createMockServices();
    services.listPurchaseOrders.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListPurchaseOrders(
      createMockNextRequest(),
      () => services as unknown as PurchaseOrderApplicationServices,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it("handleCreatePurchaseOrder returns created purchase order", async () => {
    const services = createMockServices();
    services.createPurchaseOrder.execute.mockResolvedValue({
      id: PURCHASE_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      items: VALID_CREATE_INPUT.items.map((item, index) => ({
        id: `item-${index}`,
        ...item,
        receivedQuantity: 0,
      })),
      expectedDate: VALID_CREATE_INPUT.expectedDate,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreatePurchaseOrder(
      createMockNextRequest({ method: "POST", json: VALID_CREATE_INPUT }),
      () => services as unknown as PurchaseOrderApplicationServices,
    );
    const body = await readJsonResponse<{ data: { poNumber: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.poNumber).toBe("PO-2026-001");
  });

  it("handleGetPurchaseOrderById returns purchase order", async () => {
    const services = createMockServices();
    services.getPurchaseOrderById.execute.mockResolvedValue({
      id: PURCHASE_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      items: [],
      expectedDate: VALID_CREATE_INPUT.expectedDate,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleGetPurchaseOrderById(
      createMockNextRequest(),
      PURCHASE_ORDER_ID,
      () => services as unknown as PurchaseOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleUpdatePurchaseOrder delegates to service", async () => {
    const services = createMockServices();
    services.updatePurchaseOrder.execute.mockResolvedValue({
      id: PURCHASE_ORDER_ID,
      ...VALID_CREATE_INPUT,
      remarks: "Updated",
      status: "DRAFT",
      items: [],
      expectedDate: VALID_CREATE_INPUT.expectedDate,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdatePurchaseOrder(
      createMockNextRequest({
        method: "PATCH",
        json: { remarks: "Updated" },
      }),
      PURCHASE_ORDER_ID,
      () => services as unknown as PurchaseOrderApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.updatePurchaseOrder.execute).toHaveBeenCalled();
  });

  it("handleApprovePurchaseOrder delegates to service", async () => {
    const services = createMockServices();
    services.approvePurchaseOrder.execute.mockResolvedValue({
      id: PURCHASE_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "APPROVED",
      items: [],
      expectedDate: VALID_CREATE_INPUT.expectedDate,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleApprovePurchaseOrder(
      createMockNextRequest({ method: "POST" }),
      PURCHASE_ORDER_ID,
      () => services as unknown as PurchaseOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleReceivePurchaseOrder delegates to service", async () => {
    const services = createMockServices();
    services.receivePurchaseOrder.execute.mockResolvedValue({
      id: PURCHASE_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "PARTIALLY_RECEIVED",
      items: [
        {
          id: "item-1",
          productId: PRODUCT_ID,
          quantity: 100,
          unitCost: 25.5,
          receivedQuantity: 25,
        },
      ],
      expectedDate: VALID_CREATE_INPUT.expectedDate,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleReceivePurchaseOrder(
      createMockNextRequest({
        method: "POST",
        json: { items: [{ productId: PRODUCT_ID, quantity: 25 }] },
      }),
      PURCHASE_ORDER_ID,
      () => services as unknown as PurchaseOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleCancelPurchaseOrder delegates to service", async () => {
    const services = createMockServices();
    services.cancelPurchaseOrder.execute.mockResolvedValue({
      id: PURCHASE_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "CANCELLED",
      items: [],
      expectedDate: VALID_CREATE_INPUT.expectedDate,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCancelPurchaseOrder(
      createMockNextRequest({ method: "POST" }),
      PURCHASE_ORDER_ID,
      () => services as unknown as PurchaseOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("returns error envelope when service throws", async () => {
    const services = createMockServices();
    services.getPurchaseOrderById.execute.mockRejectedValue(
      new NotFoundError({ message: "Purchase order not found" }),
    );

    const response = await handleGetPurchaseOrderById(
      createMockNextRequest(),
      PURCHASE_ORDER_ID,
      () => services as unknown as PurchaseOrderApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });
});
