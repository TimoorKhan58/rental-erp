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
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { RentalOrderApplicationServices } from "@/modules/rental-order/application/services/rental-order-application-services.interface";

import { runRentalOrderApiRoute } from "@/modules/rental-order/presentation/http/rental-order-api.route-runner";
import {
  handleCancelRentalOrder,
  handleConfirmRentalOrder,
  handleCreateRentalOrder,
  handleGetDateAwareAvailability,
  handleGetRentalOrderById,
  handleGetRentalOrderShortfall,
  handleListRentalOrders,
  handleReserveRentalOrder,
  handleSourceRentalOrderExternally,
  handleUpdateRentalOrder,
} from "@/modules/rental-order/presentation/routes/rental-order-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/rental-order/tests/helpers/api-request.factory";
import {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";

function createMockServices() {
  return {
    getRentalOrderById: { execute: vi.fn() },
    listRentalOrders: { execute: vi.fn() },
    createRentalOrder: { execute: vi.fn() },
    updateRentalOrder: { execute: vi.fn() },
    confirmRentalOrder: { execute: vi.fn() },
    reserveRentalOrder: { execute: vi.fn() },
    cancelRentalOrder: { execute: vi.fn() },
    getDateAwareAvailability: { execute: vi.fn() },
    getRentalOrderShortfall: { execute: vi.fn() },
    sourceRentalOrderExternally: { execute: vi.fn() },
  };
}

describe("runRentalOrderApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    mockUnauthenticatedUser();

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

describe("handleGetDateAwareAvailability", () => {
  const availabilitySnapshot = {
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    startDate: "2026-02-01T00:00:00.000Z",
    endDate: "2026-02-05T00:00:00.000Z",
    quantityOnHand: 100,
    reservedQuantity: 10,
    currentAvailableQuantity: 90,
    outstandingOutQuantity: 0,
    baseCapacity: 100,
    dateAwareCommittedQuantity: 40,
    dateAwareAvailableQuantity: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("A: returns availability snapshot for valid request", async () => {
    const services = createMockServices();
    services.getDateAwareAvailability.execute.mockResolvedValue(
      availabilitySnapshot,
    );

    const response = await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-05T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{
      data: typeof availabilitySnapshot;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data).toEqual(availabilitySnapshot);
    expect(services.getDateAwareAvailability.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
      }),
    );
  });

  it("B: accepts same-day period", async () => {
    const services = createMockServices();
    services.getDateAwareAvailability.execute.mockResolvedValue({
      ...availabilitySnapshot,
      startDate: "2026-02-01T00:00:00.000Z",
      endDate: "2026-02-01T00:00:00.000Z",
    });

    const response = await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-01T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("C: accepts multi-day period", async () => {
    const services = createMockServices();
    services.getDateAwareAvailability.execute.mockResolvedValue(
      availabilitySnapshot,
    );

    const response = await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-10T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("D/P: rejects invalid start > end via existing validation mapping", async () => {
    const services = createMockServices();

    const response = await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-10T00:00:00.000Z&endDate=2026-02-01T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(body.error.code).toBeDefined();
    expect(services.getDateAwareAvailability.execute).not.toHaveBeenCalled();
  });

  it("E/F: forwards productId and warehouseId isolation params", async () => {
    const services = createMockServices();
    services.getDateAwareAvailability.execute.mockResolvedValue(
      availabilitySnapshot,
    );

    await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-05T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(services.getDateAwareAvailability.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
      }),
    );
  });

  it("G–N/Q: response shape exposes business snapshot fields only", async () => {
    const services = createMockServices();
    services.getDateAwareAvailability.execute.mockResolvedValue(
      availabilitySnapshot,
    );

    const response = await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-05T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{
      data: Record<string, unknown>;
    }>(response);

    expect(Object.keys(body.data).sort()).toEqual(
      [
        "baseCapacity",
        "currentAvailableQuantity",
        "dateAwareAvailableQuantity",
        "dateAwareCommittedQuantity",
        "endDate",
        "outstandingOutQuantity",
        "productId",
        "quantityOnHand",
        "reservedQuantity",
        "startDate",
        "warehouseId",
      ].sort(),
    );
    expect(body.data).not.toHaveProperty("dispatches");
    expect(body.data).not.toHaveProperty("returns");
  });

  it("O: handler is read-only (only availability execute)", async () => {
    const services = createMockServices();
    services.getDateAwareAvailability.execute.mockResolvedValue(
      availabilitySnapshot,
    );

    await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-05T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(services.getDateAwareAvailability.execute).toHaveBeenCalledTimes(1);
    expect(services.reserveRentalOrder.execute).not.toHaveBeenCalled();
    expect(services.cancelRentalOrder.execute).not.toHaveBeenCalled();
    expect(services.updateRentalOrder.execute).not.toHaveBeenCalled();
    expect(services.createRentalOrder.execute).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticatedUser();
    const services = createMockServices();

    const response = await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-05T00:00:00.000Z`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(401);
    expect(body.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    expect(services.getDateAwareAvailability.execute).not.toHaveBeenCalled();
  });

  it("forwards optional excludeRentalOrderId", async () => {
    const services = createMockServices();
    services.getDateAwareAvailability.execute.mockResolvedValue(
      availabilitySnapshot,
    );

    await handleGetDateAwareAvailability(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/availability?productId=${PRODUCT_ID}&warehouseId=${WAREHOUSE_ID}&startDate=2026-02-01T00:00:00.000Z&endDate=2026-02-05T00:00:00.000Z&excludeRentalOrderId=${RENTAL_ORDER_ID}`,
      }),
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(services.getDateAwareAvailability.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeRentalOrderId: RENTAL_ORDER_ID,
      }),
    );
  });
});

describe("Phase 26 shortfall / source externally API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("GET shortfall requires rental-orders:read", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.getRentalOrderShortfall.execute.mockResolvedValue({
      rentalOrderId: RENTAL_ORDER_ID,
      orderNumber: "RO-1",
      status: "CONFIRMED",
      warehouseId: WAREHOUSE_ID,
      startDate: "2026-02-01T00:00:00.000Z",
      endDate: "2026-02-05T00:00:00.000Z",
      activeExternalRentalAgreementId: null,
      hasActiveExternalRentalAgreement: false,
      canSourceExternally: true,
      items: [],
    });

    const response = await handleGetRentalOrderShortfall(
      createMockNextRequest({
        url: `http://localhost/api/rental-orders/${RENTAL_ORDER_ID}/shortfall`,
      }),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.getRentalOrderShortfall.execute).toHaveBeenCalledWith({
      id: RENTAL_ORDER_ID,
    });
  });

  it("POST external-rental requires external-rentals:create", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();

    const response = await handleSourceRentalOrderExternally(
      createMockNextRequest({
        method: "POST",
        url: `http://localhost/api/rental-orders/${RENTAL_ORDER_ID}/external-rental`,
        json: {
          rentalOrderItemId: ITEM_ID,
          supplierId: "aa0e8400-e29b-41d4-a716-446655440011",
          quantity: 50,
          unitCost: 25,
        },
      }),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(services.sourceRentalOrderExternally.execute).not.toHaveBeenCalled();
  });

  it("POST external-rental creates via application service", async () => {
    const services = createMockServices();
    services.sourceRentalOrderExternally.execute.mockResolvedValue({
      id: "ee0e8400-e29b-41d4-a716-446655440001",
      agreementNumber: "ERA-2026-SHORTFALL",
      supplierId: "aa0e8400-e29b-41d4-a716-446655440011",
      warehouseId: WAREHOUSE_ID,
      rentalOrderId: RENTAL_ORDER_ID,
      status: "DRAFT",
      settlementStatus: "UNSETTLED",
      hireStartDate: "2026-02-01T00:00:00.000Z",
      hireEndDate: "2026-02-05T00:00:00.000Z",
      expectedReturnToSupplierDate: "2026-02-05T00:00:00.000Z",
      totalHireInCost: 0,
      amountDue: 0,
      amountPaid: 0,
      outstandingBalance: 0,
      remarks: null,
      createdById: "770e8400-e29b-41d4-a716-446655440000",
      items: [
        {
          id: "ee0e8400-e29b-41d4-a716-446655440002",
          productId: PRODUCT_ID,
          rentalOrderItemId: ITEM_ID,
          quantityRequested: 50,
          quantityConfirmed: 0,
          quantityReceived: 0,
          quantityAllocated: 0,
          quantityDispatched: 0,
          quantityReturnedFromCustomer: 0,
          quantityReturnedToSupplier: 0,
          quantityWrittenOff: 0,
          unitCost: 25,
          lineHireInCost: 0,
          notes: null,
          qtyWithCustomer: 0,
          qtyInCompanyCustody: 0,
          qtyOwedToSupplier: 0,
        },
      ],
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    const response = await handleSourceRentalOrderExternally(
      createMockNextRequest({
        method: "POST",
        url: `http://localhost/api/rental-orders/${RENTAL_ORDER_ID}/external-rental`,
        json: {
          rentalOrderItemId: ITEM_ID,
          supplierId: "aa0e8400-e29b-41d4-a716-446655440011",
          quantity: 50,
          unitCost: 25,
        },
      }),
      RENTAL_ORDER_ID,
      () => services as unknown as RentalOrderApplicationServices,
    );
    const body = await readJsonResponse<{
      data: { agreementNumber: string; items: Array<{ quantityRequested: number }> };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.agreementNumber).toBe("ERA-2026-SHORTFALL");
    expect(body.data.items[0]?.quantityRequested).toBe(50);
    expect(services.sourceRentalOrderExternally.execute).toHaveBeenCalledWith(
      { id: RENTAL_ORDER_ID },
      expect.objectContaining({
        rentalOrderItemId: ITEM_ID,
        quantity: 50,
        unitCost: 25,
      }),
    );
  });
});
