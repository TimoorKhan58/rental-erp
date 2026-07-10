import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { CategoryApplicationServices } from "@/modules/asset/application/services/category-application-services.interface";

import { runAssetCategoryApiRoute } from "@/modules/asset/presentation/http/asset-category-api.route-runner";
import {
  handleCreateAssetCategory,
  handleDeleteAssetCategory,
  handleGetAssetCategoryById,
  handleListAssetCategories,
  handleUpdateAssetCategory,
} from "@/modules/asset/presentation/routes/asset-category-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/asset/tests/helpers/api-request.factory";
import {
  CATEGORY_ID,
  VALID_CREATE_CATEGORY_INPUT,
} from "@/modules/asset/tests/helpers/asset-category.fixtures";

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
    getCategoryById: { execute: vi.fn() },
    listCategories: { execute: vi.fn() },
    createCategory: { execute: vi.fn() },
    updateCategory: { execute: vi.fn() },
    deleteCategory: { execute: vi.fn() },
  };
}

describe("runAssetCategoryApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runAssetCategoryApiRoute({
      request: createMockNextRequest({
        url: "http://localhost/api/asset-categories",
      }),
      route: "/api/asset-categories",
      httpMethod: "GET",
      permission: PERMISSIONS.assetCategories.read,
      resolveServices: () =>
        createMockServices() as unknown as CategoryApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAssetCategoryApiRoute({
      request: createMockNextRequest({
        url: "http://localhost/api/asset-categories",
      }),
      route: "/api/asset-categories",
      httpMethod: "POST",
      permission: PERMISSIONS.assetCategories.create,
      resolveServices: () =>
        createMockServices() as unknown as CategoryApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("allows manager to access protected route", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runAssetCategoryApiRoute({
      request: createMockNextRequest({
        url: "http://localhost/api/asset-categories",
      }),
      route: "/api/asset-categories",
      httpMethod: "GET",
      permission: PERMISSIONS.assetCategories.read,
      resolveServices: () =>
        createMockServices() as unknown as CategoryApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("Asset category API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("GET /api/asset-categories returns paginated envelope", async () => {
    const services = createMockServices();
    services.listCategories.execute.mockResolvedValue({
      items: [
        {
          ...VALID_CREATE_CATEGORY_INPUT,
          id: CATEGORY_ID,
          description: VALID_CREATE_CATEGORY_INPUT.description ?? null,
          createdAt: "2026-01-15T10:00:00.000Z",
          updatedAt: "2026-01-15T10:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListAssetCategories(
      createMockNextRequest({
        url: "http://localhost/api/asset-categories?page=1&pageSize=20",
      }),
      () => services as unknown as CategoryApplicationServices,
    );
    const body = await readJsonResponse<{
      data: { items: unknown[] };
      requestId: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
  });

  it("POST /api/asset-categories creates category", async () => {
    const services = createMockServices();
    services.createCategory.execute.mockResolvedValue({
      ...VALID_CREATE_CATEGORY_INPUT,
      id: CATEGORY_ID,
      description: VALID_CREATE_CATEGORY_INPUT.description ?? null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateAssetCategory(
      createMockNextRequest({
        url: "http://localhost/api/asset-categories",
        json: VALID_CREATE_CATEGORY_INPUT,
      }),
      () => services as unknown as CategoryApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.createCategory.execute).toHaveBeenCalledOnce();
  });

  it("DELETE /api/asset-categories/{id} deletes category", async () => {
    const services = createMockServices();
    services.deleteCategory.execute.mockResolvedValue(undefined);

    const response = await handleDeleteAssetCategory(
      createMockNextRequest({
        url: "http://localhost/api/asset-categories/1",
      }),
      CATEGORY_ID,
      () => services as unknown as CategoryApplicationServices,
    );
    const body = await readJsonResponse<{ data: null; requestId: string }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

describe("Asset category API validation and error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("rejects invalid list pagination", async () => {
    await expect(
      handleListAssetCategories(
        createMockNextRequest({
          url: "http://localhost/api/asset-categories?page=0",
        }),
        () => createMockServices() as unknown as CategoryApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid category id", async () => {
    await expect(
      handleGetAssetCategoryById(
        createMockNextRequest(),
        "not-a-uuid",
        () => createMockServices() as unknown as CategoryApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects empty update payload", async () => {
    await expect(
      handleUpdateAssetCategory(
        createMockNextRequest({ json: {} }),
        CATEGORY_ID,
        () => createMockServices() as unknown as CategoryApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("maps not found errors to response envelope", async () => {
    const services = createMockServices();
    services.getCategoryById.execute.mockRejectedValue(
      new NotFoundError({ message: "Asset category not found" }),
    );

    const response = await handleGetAssetCategoryById(
      createMockNextRequest(),
      CATEGORY_ID,
      () => services as unknown as CategoryApplicationServices,
    );
    const body = await readJsonResponse<{
      error: { code: string };
      requestId: string;
    }>(response);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });
});

describe("Asset category permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer to read categories", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listCategories.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListAssetCategories(
      createMockNextRequest({
        url: "http://localhost/api/asset-categories?page=1&pageSize=20",
      }),
      () => services as unknown as CategoryApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("denies viewer create access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleCreateAssetCategory(
      createMockNextRequest({ json: VALID_CREATE_CATEGORY_INPUT }),
      () => createMockServices() as unknown as CategoryApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
