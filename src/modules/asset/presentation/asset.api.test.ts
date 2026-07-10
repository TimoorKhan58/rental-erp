import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { AssetApplicationServices } from "@/modules/asset/application/services/asset-application-services.interface";

import { runAssetApiRoute } from "@/modules/asset/presentation/http/asset-api.route-runner";
import {
  handleAddMaintenanceHistory,
  handleCreateAsset,
  handleDisposeAsset,
  handleGetAssetById,
  handleListAssets,
  handleTransferAsset,
  handleUpdateAsset,
} from "@/modules/asset/presentation/routes/asset-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/asset/tests/helpers/api-request.factory";
import {
  ASSET_ID,
  VALID_CREATE_INPUT,
  VALID_DISPOSE_INPUT,
  VALID_MAINTENANCE_INPUT,
  VALID_TRANSFER_INPUT,
} from "@/modules/asset/tests/helpers/asset.fixtures";

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
    getAssetById: { execute: vi.fn() },
    listAssets: { execute: vi.fn() },
    createAsset: { execute: vi.fn() },
    updateAsset: { execute: vi.fn() },
    transferAsset: { execute: vi.fn() },
    disposeAsset: { execute: vi.fn() },
    addMaintenanceHistory: { execute: vi.fn() },
  };
}

describe("runAssetApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runAssetApiRoute({
      request: createMockNextRequest({ url: "http://localhost/api/assets" }),
      route: "/api/assets",
      httpMethod: "GET",
      permission: PERMISSIONS.assets.read,
      resolveServices: () => createMockServices() as unknown as AssetApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAssetApiRoute({
      request: createMockNextRequest({ url: "http://localhost/api/assets" }),
      route: "/api/assets",
      httpMethod: "POST",
      permission: PERMISSIONS.assets.create,
      resolveServices: () => createMockServices() as unknown as AssetApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("allows manager to access protected route", async () => {
    mockSession(USER_ROLES.MANAGER);
    const services = createMockServices();
    services.listAssets.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runAssetApiRoute({
      request: createMockNextRequest({ url: "http://localhost/api/assets" }),
      route: "/api/assets",
      httpMethod: "GET",
      permission: PERMISSIONS.assets.read,
      resolveServices: () => services as unknown as AssetApplicationServices,
      handler: async (_ctx, resolved) =>
        resolved.listAssets.execute({ page: 1, pageSize: 20, sortOrder: "asc" }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("requestId");
    expect(result.body).toHaveProperty("data");
  });
});

describe("Asset API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("GET /api/assets returns paginated envelope", async () => {
    const services = createMockServices();
    services.listAssets.execute.mockResolvedValue({
      items: [
        {
          ...VALID_CREATE_INPUT,
          id: ASSET_ID,
          serialNumber: VALID_CREATE_INPUT.serialNumber ?? null,
          notes: VALID_CREATE_INPUT.notes ?? null,
          assignedEmployeeId: null,
          vendorId: null,
          currentBookValue: "500000.00",
          status: "ACTIVE",
          disposalDate: null,
          disposalAmount: null,
          disposalReason: null,
          disposedById: null,
          createdById: "user-1",
          createdAt: "2026-01-15T10:00:00.000Z",
          updatedAt: "2026-01-15T10:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const response = await handleListAssets(
      createMockNextRequest({
        url: "http://localhost/api/assets?page=1&pageSize=20",
      }),
      () => services as unknown as AssetApplicationServices,
    );
    const body = await readJsonResponse<{
      data: { items: unknown[] };
      requestId: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.requestId).toBeTruthy();
    expect(body.data.items).toHaveLength(1);
  });

  it("GET /api/assets/{id} returns asset envelope", async () => {
    const services = createMockServices();
    services.getAssetById.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: ASSET_ID,
      serialNumber: VALID_CREATE_INPUT.serialNumber ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      assignedEmployeeId: null,
      vendorId: null,
      currentBookValue: "500000.00",
      status: "ACTIVE",
      disposalDate: null,
      disposalAmount: null,
      disposalReason: null,
      disposedById: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
      transfers: [],
      maintenanceHistory: [],
    });

    const response = await handleGetAssetById(
      createMockNextRequest({ url: "http://localhost/api/assets/1" }),
      ASSET_ID,
      () => services as unknown as AssetApplicationServices,
    );
    const body = await readJsonResponse<{ data: { id: string }; requestId: string }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(ASSET_ID);
  });

  it("POST /api/assets creates asset", async () => {
    const services = createMockServices();
    services.createAsset.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: ASSET_ID,
      serialNumber: VALID_CREATE_INPUT.serialNumber ?? null,
      notes: VALID_CREATE_INPUT.notes ?? null,
      assignedEmployeeId: null,
      vendorId: null,
      currentBookValue: "500000.00",
      status: "ACTIVE",
      disposalDate: null,
      disposalAmount: null,
      disposalReason: null,
      disposedById: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleCreateAsset(
      createMockNextRequest({
        url: "http://localhost/api/assets",
        json: VALID_CREATE_INPUT,
      }),
      () => services as unknown as AssetApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.createAsset.execute).toHaveBeenCalledOnce();
  });

  it("PATCH /api/assets/{id} updates asset", async () => {
    const services = createMockServices();
    services.updateAsset.execute.mockResolvedValue({
      ...VALID_CREATE_INPUT,
      id: ASSET_ID,
      name: "Updated",
      serialNumber: null,
      notes: null,
      assignedEmployeeId: null,
      vendorId: null,
      currentBookValue: "500000.00",
      status: "ACTIVE",
      disposalDate: null,
      disposalAmount: null,
      disposalReason: null,
      disposedById: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const response = await handleUpdateAsset(
      createMockNextRequest({
        url: "http://localhost/api/assets/1",
        json: { name: "Updated" },
      }),
      ASSET_ID,
      () => services as unknown as AssetApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.updateAsset.execute).toHaveBeenCalledOnce();
  });

  it("POST /api/assets/{id}/transfer transfers asset", async () => {
    const services = createMockServices();
    services.transferAsset.execute.mockResolvedValue({
      id: ASSET_ID,
      status: "ACTIVE",
    });

    const response = await handleTransferAsset(
      createMockNextRequest({
        url: "http://localhost/api/assets/1/transfer",
        json: VALID_TRANSFER_INPUT,
      }),
      ASSET_ID,
      () => services as unknown as AssetApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.transferAsset.execute).toHaveBeenCalledOnce();
  });

  it("POST /api/assets/{id}/dispose disposes asset", async () => {
    const services = createMockServices();
    services.disposeAsset.execute.mockResolvedValue({
      id: ASSET_ID,
      status: "DISPOSED",
    });

    const response = await handleDisposeAsset(
      createMockNextRequest({
        url: "http://localhost/api/assets/1/dispose",
        json: VALID_DISPOSE_INPUT,
      }),
      ASSET_ID,
      () => services as unknown as AssetApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.disposeAsset.execute).toHaveBeenCalledOnce();
  });

  it("POST /api/assets/{id}/maintenance adds maintenance", async () => {
    const services = createMockServices();
    services.addMaintenanceHistory.execute.mockResolvedValue({
      id: ASSET_ID,
      status: "UNDER_MAINTENANCE",
    });

    const response = await handleAddMaintenanceHistory(
      createMockNextRequest({
        url: "http://localhost/api/assets/1/maintenance",
        json: VALID_MAINTENANCE_INPUT,
      }),
      ASSET_ID,
      () => services as unknown as AssetApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.addMaintenanceHistory.execute).toHaveBeenCalledOnce();
  });
});

describe("Asset API validation and error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("rejects invalid list pagination", async () => {
    await expect(
      handleListAssets(
        createMockNextRequest({
          url: "http://localhost/api/assets?page=0",
        }),
        () => createMockServices() as unknown as AssetApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid asset id", async () => {
    await expect(
      handleGetAssetById(
        createMockNextRequest(),
        "not-a-uuid",
        () => createMockServices() as unknown as AssetApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects invalid create payload", async () => {
    await expect(
      handleCreateAsset(
        createMockNextRequest({
          json: { ...VALID_CREATE_INPUT, purchaseCost: -1 },
        }),
        () => createMockServices() as unknown as AssetApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("rejects empty update payload", async () => {
    await expect(
      handleUpdateAsset(
        createMockNextRequest({ json: {} }),
        ASSET_ID,
        () => createMockServices() as unknown as AssetApplicationServices,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });

  it("maps not found errors to response envelope", async () => {
    const services = createMockServices();
    services.getAssetById.execute.mockRejectedValue(
      new NotFoundError({ message: "Asset not found" }),
    );

    const response = await handleGetAssetById(
      createMockNextRequest(),
      ASSET_ID,
      () => services as unknown as AssetApplicationServices,
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

describe("Asset permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows viewer to read assets", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listAssets.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListAssets(
      createMockNextRequest({
        url: "http://localhost/api/assets?page=1&pageSize=20",
      }),
      () => services as unknown as AssetApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("denies viewer create access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleCreateAsset(
      createMockNextRequest({ json: VALID_CREATE_INPUT }),
      () => createMockServices() as unknown as AssetApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it("denies viewer transfer access", async () => {
    mockSession(USER_ROLES.VIEWER);

    const response = await handleTransferAsset(
      createMockNextRequest({ json: VALID_TRANSFER_INPUT }),
      ASSET_ID,
      () => createMockServices() as unknown as AssetApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
