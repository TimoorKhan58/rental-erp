import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { runSupplierApiRoute } from "@/modules/supplier/presentation/http/supplier-api.route-runner";
import {
  handleCreateSupplier,
  handleDeleteSupplier,
  handleGetSupplierById,
  handleListSuppliers,
  handleUpdateSupplier,
} from "@/modules/supplier/presentation/routes/supplier-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/supplier/tests/helpers/api-request.factory";
import {
  SUPPLIER_ID,
  VALID_CREATE_INPUT,
} from "@/modules/supplier/tests/helpers/supplier.fixtures";

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
    getSupplierById: { execute: vi.fn() },
    listSuppliers: { execute: vi.fn() },
    createSupplier: { execute: vi.fn() },
    updateSupplier: { execute: vi.fn() },
    deleteSupplier: { execute: vi.fn() },
  };
}

describe("runSupplierApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runSupplierApiRoute({
      request: createMockNextRequest(),
      route: "/api/suppliers",
      httpMethod: "GET",
      permission: PERMISSIONS.suppliers.read,
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

    const result = await runSupplierApiRoute({
      request: createMockNextRequest(),
      route: "/api/suppliers",
      httpMethod: "POST",
      permission: PERMISSIONS.suppliers.create,
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
    services.listSuppliers.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runSupplierApiRoute({
      request: createMockNextRequest(),
      route: "/api/suppliers",
      httpMethod: "GET",
      permission: PERMISSIONS.suppliers.read,
      resolveServices: () => services,
      handler: async (_ctx, resolved) => resolved.listSuppliers.execute({ page: 1, pageSize: 20, sortOrder: "asc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("requestId");
    expect(result.body).toHaveProperty("data");
  });
});

describe("Supplier API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("GET /api/suppliers returns paginated envelope", async () => {
    const services = createMockServices();
    services.listSuppliers.execute.mockResolvedValue({
      items: [
        {
          ...VALID_CREATE_INPUT,
          id: SUPPLIER_ID,
          email: VALID_CREATE_INPUT.email ?? null,
          notes: VALID_CREATE_INPUT.notes ?? null,
          createdAt: "2026-01-15T10:00:00.000Z",
          updatedAt: "2026-01-15T10:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListSuppliers(
      createMockNextRequest({ url: "http://localhost/api/suppliers?page=1&pageSize=20" }),
      () => services,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.requestId).toBeTruthy();
    expect(body.data.items).toHaveLength(1);
  });

  it("GET /api/suppliers/{id} returns supplier envelope", async () => {
    const services = createMockServices();
    services.getSupplierById.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: SUPPLIER_ID,
      email: VALID_CREATE_INPUT.email ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleGetSupplierById(
      createMockNextRequest(),
      SUPPLIER_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: { id: string }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(SUPPLIER_ID);
  });

  it("POST /api/suppliers creates supplier", async () => {
    const services = createMockServices();
    services.createSupplier.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: SUPPLIER_ID,
      email: VALID_CREATE_INPUT.email ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateSupplier(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.createSupplier.execute).toHaveBeenCalledOnce();
  });

  it("PATCH /api/suppliers/{id} updates supplier", async () => {
    const services = createMockServices();
    services.updateSupplier.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: SUPPLIER_ID,
      name: "Updated",
      email: VALID_CREATE_INPUT.email ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdateSupplier(
      createMockNextRequest({ json: { name: "Updated" } }),
      SUPPLIER_ID,
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.updateSupplier.execute).toHaveBeenCalledOnce();
  });

  it("DELETE /api/suppliers/{id} deletes supplier", async () => {
    const services = createMockServices();
    services.deleteSupplier.execute.mockResolvedValue(undefined);

    const response = await handleDeleteSupplier(
      createMockNextRequest(),
      SUPPLIER_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: null; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

describe("Supplier API validation and error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("rejects invalid list pagination", async () => {
    await expect(
      handleListSuppliers(
        createMockNextRequest({ url: "http://localhost/api/suppliers?page=0" }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid supplier id", async () => {
    await expect(
      handleGetSupplierById(createMockNextRequest(), "not-a-uuid", () => createMockServices()),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid create payload phone", async () => {
    await expect(
      handleCreateSupplier(
        createMockNextRequest({ json: { ...VALID_CREATE_INPUT, phone: "bad" } }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid email on create", async () => {
    await expect(
      handleCreateSupplier(
        createMockNextRequest({ json: { ...VALID_CREATE_INPUT, email: "bad" } }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects empty update payload", async () => {
    await expect(
      handleUpdateSupplier(
        createMockNextRequest({ json: {} }),
        SUPPLIER_ID,
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("maps not found errors to response envelope", async () => {
    const services = createMockServices();
    services.getSupplierById.execute.mockRejectedValue(
      new NotFoundError({ message: "Supplier not found" }),
    );

    const response = await handleGetSupplierById(
      createMockNextRequest(),
      SUPPLIER_ID,
      () => services,
    );
    const body = await readJsonResponse<{ error: { code: string }; requestId: string }>(response);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(body.requestId).toBeTruthy();
  });
});

describe("Supplier permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer to read suppliers", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listSuppliers.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListSuppliers(
      createMockNextRequest({ url: "http://localhost/api/suppliers?page=1&pageSize=20" }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("denies viewer create access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleCreateSupplier(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => createMockServices(),
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
