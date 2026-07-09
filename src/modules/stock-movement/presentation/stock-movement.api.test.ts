import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { runStockMovementApiRoute } from "@/modules/stock-movement/presentation/http/stock-movement-api.route-runner";
import {
  handleCreateStockMovement,
  handleGetStockMovementById,
  handleListStockMovements,
} from "@/modules/stock-movement/presentation/routes/stock-movement-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/stock-movement/tests/helpers/api-request.factory";
import {
  INVENTORY_ID,
  STOCK_MOVEMENT_ID,
  VALID_CREATE_INPUT,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";

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
      id: "770e8400-e29b-41d4-a716-446655440000",
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
    getStockMovementById: { execute: vi.fn() },
    listStockMovements: { execute: vi.fn() },
    createStockMovement: { execute: vi.fn() },
  };
}

const mockStockMovementDto = {
  ...VALID_CREATE_INPUT,
  id: STOCK_MOVEMENT_ID,
  productId: "880e8400-e29b-41d4-a716-446655440010",
  warehouseId: "880e8400-e29b-41d4-a716-446655440020",
  previousQuantity: 100,
  newQuantity: 110,
  createdAt: "2026-01-15T10:00:00.000Z",
  createdById: "770e8400-e29b-41d4-a716-446655440000",
};

describe("runStockMovementApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runStockMovementApiRoute({
      request: createMockNextRequest(),
      route: "/api/stock-movements",
      httpMethod: "GET",
      permission: PERMISSIONS.stockMovements.read,
      resolveServices: () => createMockServices(),
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runStockMovementApiRoute({
      request: createMockNextRequest(),
      route: "/api/stock-movements",
      httpMethod: "POST",
      permission: PERMISSIONS.stockMovements.create,
      resolveServices: () => createMockServices(),
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("allows manager to create stock movement", async () => {
    mockSession(USER_ROLES.MANAGER);
    const services = createMockServices();
    services.createStockMovement.execute.mockResolvedValue(mockStockMovementDto);

    const result = await runStockMovementApiRoute({
      request: createMockNextRequest(),
      route: "/api/stock-movements",
      httpMethod: "POST",
      permission: PERMISSIONS.stockMovements.create,
      resolveServices: () => services,
      handler: async (_ctx, resolved) =>
        resolved.createStockMovement.execute(VALID_CREATE_INPUT),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("data");
  });

  it("allows owner to read stock movements", async () => {
    mockSession(USER_ROLES.OWNER);
    const services = createMockServices();
    services.listStockMovements.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runStockMovementApiRoute({
      request: createMockNextRequest(),
      route: "/api/stock-movements",
      httpMethod: "GET",
      permission: PERMISSIONS.stockMovements.read,
      resolveServices: () => services,
      handler: async (_ctx, resolved) =>
        resolved.listStockMovements.execute({
          page: 1,
          pageSize: 20,
          sortOrder: "asc",
        }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("requestId");
  });
});

describe("Stock movement API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("GET /api/stock-movements returns paginated envelope", async () => {
    const services = createMockServices();
    services.listStockMovements.execute.mockResolvedValue({
      items: [mockStockMovementDto],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListStockMovements(
      createMockNextRequest({
        url: "http://localhost/api/stock-movements?page=1&pageSize=20",
      }),
      () => services,
    );

    const body = await readJsonResponse<{
      data: { items: unknown[]; meta: { total: number } };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.meta.total).toBe(1);
  });

  it("GET /api/stock-movements passes filters to service", async () => {
    const services = createMockServices();
    services.listStockMovements.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    await handleListStockMovements(
      createMockNextRequest({
        url: `http://localhost/api/stock-movements?page=1&pageSize=20&inventoryId=${INVENTORY_ID}&movementType=IN`,
      }),
      () => services,
    );

    expect(services.listStockMovements.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        inventoryId: INVENTORY_ID,
        movementType: "IN",
      }),
    );
  });

  it("POST /api/stock-movements creates movement", async () => {
    const services = createMockServices();
    services.createStockMovement.execute.mockResolvedValue(mockStockMovementDto);

    const response = await handleCreateStockMovement(
      createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_INPUT,
      }),
      () => services,
    );

    const body = await readJsonResponse<{ data: { id: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(STOCK_MOVEMENT_ID);
    expect(services.createStockMovement.execute).toHaveBeenCalledWith(
      VALID_CREATE_INPUT,
    );
  });

  it("GET /api/stock-movements/:id returns movement", async () => {
    const services = createMockServices();
    services.getStockMovementById.execute.mockResolvedValue(mockStockMovementDto);

    const response = await handleGetStockMovementById(
      createMockNextRequest(),
      STOCK_MOVEMENT_ID,
      () => services,
    );

    const body = await readJsonResponse<{ data: { id: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(STOCK_MOVEMENT_ID);
  });

  it("GET /api/stock-movements/:id returns 404 when not found", async () => {
    const services = createMockServices();
    services.getStockMovementById.execute.mockRejectedValue(
      new NotFoundError({ message: "Stock movement not found" }),
    );

    const response = await handleGetStockMovementById(
      createMockNextRequest(),
      STOCK_MOVEMENT_ID,
      () => services,
    );

    expect(response.status).toBe(404);
  });

  it("POST /api/stock-movements returns 400 for invalid body", async () => {
    const services = createMockServices();

    await expect(
      handleCreateStockMovement(
        createMockNextRequest({
          method: "POST",
          json: { inventoryId: INVENTORY_ID, movementType: "IN", quantity: 0 },
        }),
        () => services,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });

    expect(services.createStockMovement.execute).not.toHaveBeenCalled();
  });
});
