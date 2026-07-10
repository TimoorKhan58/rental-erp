import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { runInventoryApiRoute } from "@/modules/inventory/presentation/http/inventory-api.route-runner";
import {
  handleCreateInventory,
  handleDeleteInventory,
  handleGetInventoryById,
  handleListInventory,
  handleUpdateInventory,
} from "@/modules/inventory/presentation/routes/inventory-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/inventory/tests/helpers/api-request.factory";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";

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
    getInventoryById: { execute: vi.fn() },
    listInventory: { execute: vi.fn() },
    createInventory: { execute: vi.fn() },
    updateInventory: { execute: vi.fn() },
    deleteInventory: { execute: vi.fn() },
  };
}

const mockInventoryDto = {
  ...VALID_CREATE_INPUT,
  id: INVENTORY_ID,
  availableQuantity: 90,
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-15T10:00:00.000Z",
};

describe("runInventoryApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runInventoryApiRoute({
      request: createMockNextRequest(),
      route: "/api/inventory",
      httpMethod: "GET",
      permission: PERMISSIONS.inventory.read,
      resolveServices: () => createMockServices(),
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runInventoryApiRoute({
      request: createMockNextRequest(),
      route: "/api/inventory",
      httpMethod: "POST",
      permission: PERMISSIONS.inventory.create,
      resolveServices: () => createMockServices(),
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("allows owner to access protected route", async () => {
    mockSession(USER_ROLES.OWNER);
    const services = createMockServices();
    services.listInventory.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runInventoryApiRoute({
      request: createMockNextRequest(),
      route: "/api/inventory",
      httpMethod: "GET",
      permission: PERMISSIONS.inventory.read,
      resolveServices: () => services,
      handler: async (_ctx, resolved) =>
        resolved.listInventory.execute({ page: 1, pageSize: 20, sortOrder: "asc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("requestId");
    expect(result.body).toHaveProperty("data");
  });
});

describe("Inventory API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("GET /api/inventory returns paginated envelope", async () => {
    const services = createMockServices();
    services.listInventory.execute.mockResolvedValue({
      items: [mockInventoryDto],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListInventory(
      createMockNextRequest({
        url: "http://localhost/api/inventory?page=1&pageSize=20",
      }),
      () => services,
    );
    const body = await readJsonResponse<{
      data: { items: unknown[] };
      requestId: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.requestId).toBeTruthy();
    expect(body.data.items).toHaveLength(1);
  });

  it("GET /api/inventory/{id} returns inventory envelope", async () => {
    const services = createMockServices();
    services.getInventoryById.execute.mockResolvedValue(mockInventoryDto);

    const response = await handleGetInventoryById(
      createMockNextRequest(),
      INVENTORY_ID,
      () => services,
    );
    const body = await readJsonResponse<{
      data: { id: string; availableQuantity: number };
      requestId: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(INVENTORY_ID);
    expect(body.data.availableQuantity).toBe(90);
  });

  it("POST /api/inventory creates inventory", async () => {
    const services = createMockServices();
    services.createInventory.execute.mockResolvedValue(mockInventoryDto);

    const response = await handleCreateInventory(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.createInventory.execute).toHaveBeenCalledOnce();
  });

  it("PATCH /api/inventory/{id} updates inventory", async () => {
    const services = createMockServices();
    services.updateInventory.execute.mockResolvedValue({
      ...mockInventoryDto,
      quantityOnHand: 200,
      availableQuantity: 190,
    });

    const response = await handleUpdateInventory(
      createMockNextRequest({ json: { quantityOnHand: 200 } }),
      INVENTORY_ID,
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.updateInventory.execute).toHaveBeenCalledOnce();
  });

  it("DELETE /api/inventory/{id} deletes inventory", async () => {
    const services = createMockServices();
    services.deleteInventory.execute.mockResolvedValue(undefined);

    const response = await handleDeleteInventory(
      createMockNextRequest(),
      INVENTORY_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: null; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

describe("Inventory API validation and error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("rejects invalid list pagination", async () => {
    await expect(
      handleListInventory(
        createMockNextRequest({ url: "http://localhost/api/inventory?page=0" }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid inventory id", async () => {
    await expect(
      handleGetInventoryById(
        createMockNextRequest(),
        "not-a-uuid",
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid create payload quantityOnHand", async () => {
    await expect(
      handleCreateInventory(
        createMockNextRequest({
          json: { ...VALID_CREATE_INPUT, quantityOnHand: -1 },
        }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("accepts create payload with required fields only", async () => {
    const services = createMockServices();
    const minimalInput = {
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 50,
    };
    services.createInventory.execute.mockResolvedValue({
      ...minimalInput,
      id: INVENTORY_ID,
      reservedQuantity: 0,
      minimumStock: 0,
      maximumStock: null,
      availableQuantity: 50,
      isActive: true,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateInventory(
      createMockNextRequest({ json: minimalInput }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("rejects empty update payload", async () => {
    await expect(
      handleUpdateInventory(
        createMockNextRequest({ json: {} }),
        INVENTORY_ID,
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("maps not found errors to response envelope", async () => {
    const services = createMockServices();
    services.getInventoryById.execute.mockRejectedValue(
      new NotFoundError({ message: "Inventory not found" }),
    );

    const response = await handleGetInventoryById(
      createMockNextRequest(),
      INVENTORY_ID,
      () => services,
    );
    const body = await readJsonResponse<{
      error: { code: string };
      requestId: string;
    }>(response);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(body.requestId).toBeTruthy();
  });
});

describe("Inventory permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer to read inventory", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listInventory.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListInventory(
      createMockNextRequest({
        url: "http://localhost/api/inventory?page=1&pageSize=20",
      }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("denies viewer create access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleCreateInventory(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => createMockServices(),
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
