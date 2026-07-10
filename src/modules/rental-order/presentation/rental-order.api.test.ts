import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { RentalOrderApplicationServices } from "@/modules/rental-order/application/services/rental-order-application-services.interface";

import { runRentalOrderApiRoute } from "@/modules/rental-order/presentation/http/rental-order-api.route-runner";
import {
  handleCancelRentalOrder,
  handleConfirmRentalOrder,
  handleCreateRentalOrder,
  handleGetRentalOrderById,
  handleListRentalOrders,
  handleReserveRentalOrder,
  handleUpdateRentalOrder,
} from "@/modules/rental-order/presentation/routes/rental-order-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/rental-order/tests/helpers/api-request.factory";
import {
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";

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
    getRentalOrderById: { execute: vi.fn() },
    listRentalOrders: { execute: vi.fn() },
    createRentalOrder: { execute: vi.fn() },
    updateRentalOrder: { execute: vi.fn() },
    confirmRentalOrder: { execute: vi.fn() },
    reserveRentalOrder: { execute: vi.fn() },
    cancelRentalOrder: { execute: vi.fn() },
  };
}

describe("runRentalOrderApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runRentalOrderApiRoute({
      request: createMockNextRequest(),
      route: "/api/rental-orders",
      httpMethod: "GET",
      permission: PERMISSIONS.rentalOrders.read,
      resolveServices: () => createMockServices() as unknown as RentalOrderApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runRentalOrderApiRoute({
      request: createMockNextRequest(),
      route: "/api/rental-orders",
      httpMethod: "POST",
      permission: PERMISSIONS.rentalOrders.create,
      resolveServices: () => createMockServices() as unknown as RentalOrderApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runRentalOrderApiRoute({
      request: createMockNextRequest(),
      route: "/api/rental-orders",
      httpMethod: "GET",
      permission: PERMISSIONS.rentalOrders.read,
      resolveServices: () => createMockServices() as unknown as RentalOrderApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("rental order route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("handleListRentalOrders returns list envelope", async () => {
    const services = createMockServices();
    services.listRentalOrders.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListRentalOrders(
      createMockNextRequest(),
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it("handleCreateRentalOrder returns created rental order", async () => {
    const services = createMockServices();
    services.createRentalOrder.execute.mockResolvedValue({
      id: RENTAL_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      items: VALID_CREATE_INPUT.items.map((item, index) => ({
        id: `item-${index}`,
        ...item,
        reservedQuantity: 0,
      })),
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateRentalOrder(
      createMockNextRequest({ method: "POST", json: VALID_CREATE_INPUT }),
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{ data: { orderNumber: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.orderNumber).toBe("RO-2026-001");
  });

  it("handleGetRentalOrderById returns rental order", async () => {
    const services = createMockServices();
    services.getRentalOrderById.execute.mockResolvedValue({
      id: RENTAL_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      items: [],
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleGetRentalOrderById(
      createMockNextRequest(),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleUpdateRentalOrder delegates to service", async () => {
    const services = createMockServices();
    services.updateRentalOrder.execute.mockResolvedValue({
      id: RENTAL_ORDER_ID,
      ...VALID_CREATE_INPUT,
      remarks: "Updated",
      status: "DRAFT",
      items: [],
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdateRentalOrder(
      createMockNextRequest({
        method: "PATCH",
        json: { remarks: "Updated" },
      }),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.updateRentalOrder.execute).toHaveBeenCalled();
  });

  it("handleConfirmRentalOrder delegates to service", async () => {
    const services = createMockServices();
    services.confirmRentalOrder.execute.mockResolvedValue({
      id: RENTAL_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "CONFIRMED",
      items: [],
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleConfirmRentalOrder(
      createMockNextRequest({ method: "POST" }),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleReserveRentalOrder delegates to service", async () => {
    const services = createMockServices();
    services.reserveRentalOrder.execute.mockResolvedValue({
      id: RENTAL_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "CONFIRMED",
      items: [
        {
          id: "item-1",
          productId: PRODUCT_ID,
          quantity: 10,
          dailyRate: 150,
          reservedQuantity: 5,
        },
      ],
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleReserveRentalOrder(
      createMockNextRequest({
        method: "POST",
        json: { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
      }),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleCancelRentalOrder delegates to service", async () => {
    const services = createMockServices();
    services.cancelRentalOrder.execute.mockResolvedValue({
      id: RENTAL_ORDER_ID,
      ...VALID_CREATE_INPUT,
      status: "CANCELLED",
      items: [],
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCancelRentalOrder(
      createMockNextRequest({ method: "POST" }),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("returns error envelope when service throws", async () => {
    const services = createMockServices();
    services.getRentalOrderById.execute.mockRejectedValue(
      new NotFoundError({ message: "Rental order not found" }),
    );

    const response = await handleGetRentalOrderById(
      createMockNextRequest(),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });
});

describe("runRentalOrderApiRoute reserve permission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows worker role to reserve", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runRentalOrderApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/rental-orders/1/reserve",
      httpMethod: "POST",
      permission: PERMISSIONS.rentalOrders.reserve,
      resolveServices: () => createMockServices() as unknown as RentalOrderApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});
