import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { runWarehouseApiRoute } from "@/modules/warehouse/presentation/http/warehouse-api.route-runner";
import {
  handleCreateWarehouse,
  handleDeleteWarehouse,
  handleGetWarehouseById,
  handleListWarehouses,
  handleUpdateWarehouse,
} from "@/modules/warehouse/presentation/routes/warehouse-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/warehouse/tests/helpers/api-request.factory";
import {
  WAREHOUSE_ID,
  VALID_CREATE_INPUT,
} from "@/modules/warehouse/tests/helpers/warehouse.fixtures";

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
    getWarehouseById: { execute: vi.fn() },
    listWarehouses: { execute: vi.fn() },
    createWarehouse: { execute: vi.fn() },
    updateWarehouse: { execute: vi.fn() },
    deleteWarehouse: { execute: vi.fn() },
  };
}

describe("runWarehouseApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runWarehouseApiRoute({
      request: createMockNextRequest(),
      route: "/api/warehouses",
      httpMethod: "GET",
      permission: PERMISSIONS.warehouses.read,
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

    const result = await runWarehouseApiRoute({
      request: createMockNextRequest(),
      route: "/api/warehouses",
      httpMethod: "POST",
      permission: PERMISSIONS.warehouses.create,
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
    services.listWarehouses.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runWarehouseApiRoute({
      request: createMockNextRequest(),
      route: "/api/warehouses",
      httpMethod: "GET",
      permission: PERMISSIONS.warehouses.read,
      resolveServices: () => services,
      handler: async (_ctx, resolved) =>
        resolved.listWarehouses.execute({ page: 1, pageSize: 20, sortOrder: "asc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("requestId");
    expect(result.body).toHaveProperty("data");
  });
});

describe("Warehouse API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("GET /api/warehouses returns paginated envelope", async () => {
    const services = createMockServices();
    services.listWarehouses.execute.mockResolvedValue({
      items: [
        {
          ...VALID_CREATE_INPUT,
          id: WAREHOUSE_ID,
          description: VALID_CREATE_INPUT.description ?? null,
          address: VALID_CREATE_INPUT.address ?? null,
          contactPerson: VALID_CREATE_INPUT.contactPerson ?? null,
          phone: VALID_CREATE_INPUT.phone ?? null,
          createdAt: "2026-01-15T10:00:00.000Z",
          updatedAt: "2026-01-15T10:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListWarehouses(
      createMockNextRequest({ url: "http://localhost/api/warehouses?page=1&pageSize=20" }),
      () => services,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.requestId).toBeTruthy();
    expect(body.data.items).toHaveLength(1);
  });

  it("GET /api/warehouses/{id} returns warehouse envelope", async () => {
    const services = createMockServices();
    services.getWarehouseById.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: WAREHOUSE_ID,
      description: VALID_CREATE_INPUT.description ?? null,
      address: VALID_CREATE_INPUT.address ?? null,
      contactPerson: VALID_CREATE_INPUT.contactPerson ?? null,
      phone: VALID_CREATE_INPUT.phone ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleGetWarehouseById(
      createMockNextRequest(),
      WAREHOUSE_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: { id: string }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(WAREHOUSE_ID);
  });

  it("POST /api/warehouses creates warehouse", async () => {
    const services = createMockServices();
    services.createWarehouse.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: WAREHOUSE_ID,
      description: VALID_CREATE_INPUT.description ?? null,
      address: VALID_CREATE_INPUT.address ?? null,
      contactPerson: VALID_CREATE_INPUT.contactPerson ?? null,
      phone: VALID_CREATE_INPUT.phone ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateWarehouse(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.createWarehouse.execute).toHaveBeenCalledOnce();
  });

  it("PATCH /api/warehouses/{id} updates warehouse", async () => {
    const services = createMockServices();
    services.updateWarehouse.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: WAREHOUSE_ID,
      name: "Updated",
      description: VALID_CREATE_INPUT.description ?? null,
      address: VALID_CREATE_INPUT.address ?? null,
      contactPerson: VALID_CREATE_INPUT.contactPerson ?? null,
      phone: VALID_CREATE_INPUT.phone ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdateWarehouse(
      createMockNextRequest({ json: { name: "Updated" } }),
      WAREHOUSE_ID,
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.updateWarehouse.execute).toHaveBeenCalledOnce();
  });

  it("DELETE /api/warehouses/{id} deletes warehouse", async () => {
    const services = createMockServices();
    services.deleteWarehouse.execute.mockResolvedValue(undefined);

    const response = await handleDeleteWarehouse(
      createMockNextRequest(),
      WAREHOUSE_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: null; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

describe("Warehouse API validation and error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("rejects invalid list pagination", async () => {
    await expect(
      handleListWarehouses(
        createMockNextRequest({ url: "http://localhost/api/warehouses?page=0" }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid warehouse id", async () => {
    await expect(
      handleGetWarehouseById(createMockNextRequest(), "not-a-uuid", () => createMockServices()),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid create payload phone", async () => {
    await expect(
      handleCreateWarehouse(
        createMockNextRequest({ json: { ...VALID_CREATE_INPUT, phone: "bad" } }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("accepts create payload without phone", async () => {
    const services = createMockServices();
    const inputWithoutPhone = {
      warehouseCode: VALID_CREATE_INPUT.warehouseCode,
      name: VALID_CREATE_INPUT.name,
      description: VALID_CREATE_INPUT.description,
      address: VALID_CREATE_INPUT.address,
      contactPerson: VALID_CREATE_INPUT.contactPerson,
      isActive: VALID_CREATE_INPUT.isActive,
    };
    services.createWarehouse.execute.mockResolvedValue({
      ...inputWithoutPhone,
      id: WAREHOUSE_ID,
      description: inputWithoutPhone.description ?? null,
      address: inputWithoutPhone.address ?? null,
      contactPerson: inputWithoutPhone.contactPerson ?? null,
      phone: null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateWarehouse(
      createMockNextRequest({ json: inputWithoutPhone }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("rejects empty update payload", async () => {
    await expect(
      handleUpdateWarehouse(
        createMockNextRequest({ json: {} }),
        WAREHOUSE_ID,
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("maps not found errors to response envelope", async () => {
    const services = createMockServices();
    services.getWarehouseById.execute.mockRejectedValue(
      new NotFoundError({ message: "Warehouse not found" }),
    );

    const response = await handleGetWarehouseById(
      createMockNextRequest(),
      WAREHOUSE_ID,
      () => services,
    );
    const body = await readJsonResponse<{ error: { code: string }; requestId: string }>(response);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(body.requestId).toBeTruthy();
  });
});

describe("Warehouse permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer to read warehouses", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listWarehouses.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListWarehouses(
      createMockNextRequest({ url: "http://localhost/api/warehouses?page=1&pageSize=20" }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("denies viewer create access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleCreateWarehouse(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => createMockServices(),
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
