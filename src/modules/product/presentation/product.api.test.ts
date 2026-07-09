import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { runProductApiRoute } from "@/modules/product/presentation/http/product-api.route-runner";
import {
  handleCreateProduct,
  handleDeleteProduct,
  handleGetProductById,
  handleListProducts,
  handleUpdateProduct,
} from "@/modules/product/presentation/routes/product-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/product/tests/helpers/api-request.factory";
import {
  PRODUCT_ID,
  VALID_CREATE_INPUT,
} from "@/modules/product/tests/helpers/product.fixtures";

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
    getProductById: { execute: vi.fn() },
    listProducts: { execute: vi.fn() },
    createProduct: { execute: vi.fn() },
    updateProduct: { execute: vi.fn() },
    deleteProduct: { execute: vi.fn() },
  };
}

const mockProductDto = {
  ...VALID_CREATE_INPUT,
  id: PRODUCT_ID,
  description: VALID_CREATE_INPUT.description ?? null,
  rentalRate: "1500.00",
  replacementCost: "50000.00",
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-15T10:00:00.000Z",
};

describe("runProductApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runProductApiRoute({
      request: createMockNextRequest(),
      route: "/api/products",
      httpMethod: "GET",
      permission: PERMISSIONS.products.read,
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

    const result = await runProductApiRoute({
      request: createMockNextRequest(),
      route: "/api/products",
      httpMethod: "POST",
      permission: PERMISSIONS.products.create,
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
    services.listProducts.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runProductApiRoute({
      request: createMockNextRequest(),
      route: "/api/products",
      httpMethod: "GET",
      permission: PERMISSIONS.products.read,
      resolveServices: () => services,
      handler: async (_ctx, resolved) =>
        resolved.listProducts.execute({ page: 1, pageSize: 20, sortOrder: "asc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("requestId");
    expect(result.body).toHaveProperty("data");
  });
});

describe("Product API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("GET /api/products returns paginated envelope", async () => {
    const services = createMockServices();
    services.listProducts.execute.mockResolvedValue({
      items: [mockProductDto],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListProducts(
      createMockNextRequest({ url: "http://localhost/api/products?page=1&pageSize=20" }),
      () => services,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.requestId).toBeTruthy();
    expect(body.data.items).toHaveLength(1);
  });

  it("GET /api/products/{id} returns product envelope", async () => {
    const services = createMockServices();
    services.getProductById.execute.mockResolvedValue(mockProductDto);

    const response = await handleGetProductById(
      createMockNextRequest(),
      PRODUCT_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: { id: string }; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(PRODUCT_ID);
  });

  it("POST /api/products creates product", async () => {
    const services = createMockServices();
    services.createProduct.execute.mockResolvedValue(mockProductDto);

    const response = await handleCreateProduct(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.createProduct.execute).toHaveBeenCalledOnce();
  });

  it("PATCH /api/products/{id} updates product", async () => {
    const services = createMockServices();
    services.updateProduct.execute.mockResolvedValue({
      ...mockProductDto,
      name: "Updated",
    });

    const response = await handleUpdateProduct(
      createMockNextRequest({ json: { name: "Updated" } }),
      PRODUCT_ID,
      () => services,
    );

    expect(response.status).toBe(200);
    expect(services.updateProduct.execute).toHaveBeenCalledOnce();
  });

  it("DELETE /api/products/{id} deletes product", async () => {
    const services = createMockServices();
    services.deleteProduct.execute.mockResolvedValue(undefined);

    const response = await handleDeleteProduct(
      createMockNextRequest(),
      PRODUCT_ID,
      () => services,
    );
    const body = await readJsonResponse<{ data: null; requestId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

describe("Product API validation and error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.OWNER);
  });

  it("rejects invalid list pagination", async () => {
    await expect(
      handleListProducts(
        createMockNextRequest({ url: "http://localhost/api/products?page=0" }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid product id", async () => {
    await expect(
      handleGetProductById(createMockNextRequest(), "not-a-uuid", () => createMockServices()),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid create payload rental rate", async () => {
    await expect(
      handleCreateProduct(
        createMockNextRequest({ json: { ...VALID_CREATE_INPUT, rentalRate: 0 } }),
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("accepts create payload without replacement cost", async () => {
    const services = createMockServices();
    const inputWithoutCost = {
      productCode: VALID_CREATE_INPUT.productCode,
      name: VALID_CREATE_INPUT.name,
      description: VALID_CREATE_INPUT.description,
      unit: VALID_CREATE_INPUT.unit,
      rentalRate: VALID_CREATE_INPUT.rentalRate,
      isActive: VALID_CREATE_INPUT.isActive,
    };
    services.createProduct.execute.mockResolvedValue({
      ...inputWithoutCost,
      id: PRODUCT_ID,
      description: inputWithoutCost.description ?? null,
      rentalRate: "1500.00",
      replacementCost: null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateProduct(
      createMockNextRequest({ json: inputWithoutCost }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("rejects empty update payload", async () => {
    await expect(
      handleUpdateProduct(
        createMockNextRequest({ json: {} }),
        PRODUCT_ID,
        () => createMockServices(),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("maps not found errors to response envelope", async () => {
    const services = createMockServices();
    services.getProductById.execute.mockRejectedValue(
      new NotFoundError({ message: "Product not found" }),
    );

    const response = await handleGetProductById(
      createMockNextRequest(),
      PRODUCT_ID,
      () => services,
    );
    const body = await readJsonResponse<{ error: { code: string }; requestId: string }>(response);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(body.requestId).toBeTruthy();
  });
});

describe("Product permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer to read products", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listProducts.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListProducts(
      createMockNextRequest({ url: "http://localhost/api/products?page=1&pageSize=20" }),
      () => services,
    );

    expect(response.status).toBe(200);
  });

  it("denies viewer create access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleCreateProduct(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => createMockServices(),
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
