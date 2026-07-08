import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { runCustomerApiRoute } from "@/modules/customer/presentation/http/customer-api.route-runner";
import {
  handleCreateCustomer,
  handleDeleteCustomer,
  handleGetCustomerById,
  handleListCustomers,
  handleUpdateCustomer,
} from "@/modules/customer/presentation/routes/customer-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/customer/tests/helpers/api-request.factory";
import {
  CUSTOMER_ID,
  VALID_CREATE_INPUT,
} from "@/modules/customer/tests/helpers/customer.fixtures";

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
    getCustomerById: { execute: vi.fn() },
    listCustomers: { execute: vi.fn() },
    createCustomer: { execute: vi.fn() },
    updateCustomer: { execute: vi.fn() },
    deleteCustomer: { execute: vi.fn() },
  };
}

describe("runCustomerApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runCustomerApiRoute({
      request: createMockNextRequest(),
      route: "/api/customers",
      httpMethod: "GET",
      permission: PERMISSIONS.customers.read,
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

    const result = await runCustomerApiRoute({
      request: createMockNextRequest(),
      route: "/api/customers",
      httpMethod: "POST",
      permission: PERMISSIONS.customers.create,
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
    services.listCustomers.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runCustomerApiRoute({
      request: createMockNextRequest(),
      route: "/api/customers",
      httpMethod: "GET",
      permission: PERMISSIONS.customers.read,
      resolveServices: () => services,
      handler: async (_ctx, resolved) => resolved.listCustomers.execute({ page: 1, pageSize: 20, sortOrder: "asc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("requestId");
    expect(result.body).toHaveProperty("data");
  });
});

describe("Customer API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("GET /api/customers returns paginated envelope", async () => {
    const services = createMockServices();
    services.listCustomers.execute.mockResolvedValue({
      items: [
        {
          ...VALID_CREATE_INPUT,
          id: CUSTOMER_ID,
          cnic: VALID_CREATE_INPUT.cnic ?? null,
          notes: VALID_CREATE_INPUT.notes ?? null,
          createdAt: "2026-01-15T10:00:00.000Z",
          updatedAt: "2026-01-15T10:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListCustomers(
      createMockNextRequest({ url: "http://localhost/api/customers?page=1&pageSize=20" }),
      () => services,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.requestId).toBeTruthy();
    expect(body.data.items).toHaveLength(1);
  });

  it("GET /api/customers/{id} returns customer envelope", async () => {
    const services = createMockServices();
    services.getCustomerById.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: CUSTOMER_ID,
      cnic: VALID_CREATE_INPUT.cnic ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleGetCustomerById(
      createMockNextRequest(),
      CUSTOMER_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: { id: string }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(CUSTOMER_ID);
  });

  it("POST /api/customers creates customer", async () => {
    const services = createMockServices();
    services.createCustomer.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: CUSTOMER_ID,
      cnic: VALID_CREATE_INPUT.cnic ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateCustomer(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.createCustomer.execute).toHaveBeenCalledOnce();
  });

  it("PATCH /api/customers/{id} updates customer", async () => {
    const services = createMockServices();
    services.updateCustomer.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: CUSTOMER_ID,
      name: "Updated",
      cnic: VALID_CREATE_INPUT.cnic ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdateCustomer(
      createMockNextRequest({ json: { name: "Updated" } }),
      CUSTOMER_ID,
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.updateCustomer.execute).toHaveBeenCalledOnce();
  });

  it("DELETE /api/customers/{id} deletes customer", async () => {
    const services = createMockServices();
    services.deleteCustomer.execute.mockResolvedValue(undefined);

    const response = await handleDeleteCustomer(
      createMockNextRequest(),
      CUSTOMER_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: null; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

describe("Customer API validation and error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("rejects invalid list pagination", async () => {
    await expect(
      handleListCustomers(
        createMockNextRequest({ url: "http://localhost/api/customers?page=0" }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid customer id", async () => {
    await expect(
      handleGetCustomerById(createMockNextRequest(), "not-a-uuid", () => createMockServices()),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid create payload phone", async () => {
    await expect(
      handleCreateCustomer(
        createMockNextRequest({ json: { ...VALID_CREATE_INPUT, phone: "bad" } }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid CNIC on create", async () => {
    await expect(
      handleCreateCustomer(
        createMockNextRequest({ json: { ...VALID_CREATE_INPUT, cnic: "bad" } }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects empty update payload", async () => {
    await expect(
      handleUpdateCustomer(
        createMockNextRequest({ json: {} }),
        CUSTOMER_ID,
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("maps not found errors to response envelope", async () => {
    const services = createMockServices();
    services.getCustomerById.execute.mockRejectedValue(
      new NotFoundError({ message: "Customer not found" }),
    );

    const response = await handleGetCustomerById(
      createMockNextRequest(),
      CUSTOMER_ID,
      () => services,
    );
    const body = await readJsonResponse<{ error: { code: string }; requestId: string }>(response);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(body.requestId).toBeTruthy();
  });
});

describe("Customer permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer to read customers", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listCustomers.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListCustomers(
      createMockNextRequest({ url: "http://localhost/api/customers?page=1&pageSize=20" }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("denies viewer create access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleCreateCustomer(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => createMockServices(),
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
