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
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { ExternalRentalApplicationServices } from "@/modules/external-rental/application/services/external-rental-application-services.interface";

import { runExternalRentalApiRoute } from "@/modules/external-rental/presentation/http/external-rental-api.route-runner";
import {
  handleAllocateExternalRental,
  handleConfirmExternalRental,
  handleCreateExternalRental,
  handleGetExternalRentalById,
  handleListExternalRentals,
  handleReceiveExternalRental,
  handleSettleExternalRental,
  handleSupplierReturnExternalRental,
} from "@/modules/external-rental/presentation/routes/external-rental-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/external-rental/tests/helpers/api-request.factory";
import {
  AGREEMENT_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ITEM_ID,
  VALID_CREATE_INPUT,
} from "@/modules/external-rental/tests/helpers/external-rental.fixtures";

function createMockDto(overrides: Record<string, unknown> = {}) {
  return {
    id: AGREEMENT_ID,
    ...VALID_CREATE_INPUT,
    status: "DRAFT",
    settlementStatus: "UNSETTLED",
    totalHireInCost: 0,
    amountDue: 0,
    amountPaid: 0,
    outstandingBalance: 0,
    createdById: "aa0e8400-e29b-41d4-a716-446655440016",
    items: VALID_CREATE_INPUT.items.map((item, index) => ({
      id: `item-${index}`,
      ...item,
      quantityConfirmed: 0,
      quantityReceived: 0,
      quantityAllocated: 0,
      quantityDispatched: 0,
      quantityReturnedFromCustomer: 0,
      quantityReturnedToSupplier: 0,
      quantityWrittenOff: 0,
      lineHireInCost: 0,
      qtyWithCustomer: 0,
      qtyInCompanyCustody: 0,
      qtyOwedToSupplier: 0,
    })),
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function createMockServices() {
  return {
    repository: {},
    getExternalRentalById: { execute: vi.fn() },
    listExternalRentals: { execute: vi.fn() },
    createExternalRental: { execute: vi.fn() },
    confirmExternalRental: { execute: vi.fn() },
    receiveExternalRental: { execute: vi.fn() },
    allocateExternalRental: { execute: vi.fn() },
    supplierReturnExternalRental: { execute: vi.fn() },
    settleExternalRental: { execute: vi.fn() },
  };
}

describe("runExternalRentalApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    mockUnauthenticatedUser();

    const result = await runExternalRentalApiRoute({
      request: createMockNextRequest(),
      route: "/api/external-rentals",
      httpMethod: "GET",
      permission: PERMISSIONS.externalRentals.read,
      resolveServices: () =>
        createMockServices() as unknown as ExternalRentalApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runExternalRentalApiRoute({
      request: createMockNextRequest(),
      route: "/api/external-rentals",
      httpMethod: "POST",
      permission: PERMISSIONS.externalRentals.create,
      resolveServices: () =>
        createMockServices() as unknown as ExternalRentalApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runExternalRentalApiRoute({
      request: createMockNextRequest(),
      route: "/api/external-rentals",
      httpMethod: "GET",
      permission: PERMISSIONS.externalRentals.read,
      resolveServices: () =>
        createMockServices() as unknown as ExternalRentalApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("external rental route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("handleListExternalRentals returns list envelope", async () => {
    const services = createMockServices();
    services.listExternalRentals.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await handleListExternalRentals(
      createMockNextRequest(),
      () => services as unknown as ExternalRentalApplicationServices,
    );
    const body = await readJsonResponse<{ data: { items: unknown[] } }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it("handleCreateExternalRental returns created agreement", async () => {
    const services = createMockServices();
    services.createExternalRental.execute.mockResolvedValue(createMockDto());

    const response = await handleCreateExternalRental(
      createMockNextRequest({ method: "POST", json: VALID_CREATE_INPUT }),
      () => services as unknown as ExternalRentalApplicationServices,
    );
    const body = await readJsonResponse<{
      data: { agreementNumber: string; outstandingBalance: number };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.agreementNumber).toBe("ERA-2026-001");
    expect(body.data.outstandingBalance).toBe(0);
  });

  it("handleGetExternalRentalById returns agreement with custody fields", async () => {
    const services = createMockServices();
    services.getExternalRentalById.execute.mockResolvedValue(createMockDto());

    const response = await handleGetExternalRentalById(
      createMockNextRequest(),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );
    const body = await readJsonResponse<{
      data: { items: Array<{ qtyInCompanyCustody: number }> };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.items[0]?.qtyInCompanyCustody).toBe(0);
  });

  it("handleConfirmExternalRental delegates to service", async () => {
    const services = createMockServices();
    services.confirmExternalRental.execute.mockResolvedValue(
      createMockDto({ status: "CONFIRMED", amountDue: 5000 }),
    );

    const response = await handleConfirmExternalRental(
      createMockNextRequest({ method: "POST", json: {} }),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );

    expect(response.status).toBe(200);
    expect(services.confirmExternalRental.execute).toHaveBeenCalled();
  });

  it("handleReceiveExternalRental delegates to service", async () => {
    const services = createMockServices();
    services.receiveExternalRental.execute.mockResolvedValue(
      createMockDto({ status: "RECEIVED" }),
    );

    const response = await handleReceiveExternalRental(
      createMockNextRequest({
        method: "POST",
        json: {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 50 }],
        },
      }),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleAllocateExternalRental delegates to service", async () => {
    const services = createMockServices();
    services.allocateExternalRental.execute.mockResolvedValue(
      createMockDto({ status: "ALLOCATED" }),
    );

    const response = await handleAllocateExternalRental(
      createMockNextRequest({
        method: "POST",
        json: {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 50 }],
        },
      }),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleSupplierReturnExternalRental delegates to service", async () => {
    const services = createMockServices();
    services.supplierReturnExternalRental.execute.mockResolvedValue(
      createMockDto({ status: "RETURNED" }),
    );

    const response = await handleSupplierReturnExternalRental(
      createMockNextRequest({
        method: "POST",
        json: {
          items: [{ rentalOrderItemId: RENTAL_ORDER_ITEM_ID, quantity: 50 }],
        },
      }),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("handleSettleExternalRental delegates to service", async () => {
    const services = createMockServices();
    services.settleExternalRental.execute.mockResolvedValue(
      createMockDto({
        settlementStatus: "PARTIALLY_SETTLED",
        amountDue: 5000,
        amountPaid: 1000,
        outstandingBalance: 4000,
      }),
    );

    const response = await handleSettleExternalRental(
      createMockNextRequest({
        method: "POST",
        json: { paymentAmount: 1000 },
      }),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );

    expect(response.status).toBe(200);
  });

  it("rejects invalid create body", async () => {
    const services = createMockServices();

    const response = await handleCreateExternalRental(
      createMockNextRequest({
        method: "POST",
        json: { supplierId: "not-a-uuid" },
      }),
      () => services as unknown as ExternalRentalApplicationServices,
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(services.createExternalRental.execute).not.toHaveBeenCalled();
  });

  it("maps UnprocessableError from service", async () => {
    const services = createMockServices();
    services.confirmExternalRental.execute.mockRejectedValue(
      new UnprocessableError({ message: "Invalid status for confirm" }),
    );

    const response = await handleConfirmExternalRental(
      createMockNextRequest({ method: "POST", json: {} }),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(422);
    expect(body.error.code).toBe(ERROR_CODES.INVALID_STATE);
  });

  it("returns error envelope when service throws NotFound", async () => {
    const services = createMockServices();
    services.getExternalRentalById.execute.mockRejectedValue(
      new NotFoundError({ message: "External rental agreement not found" }),
    );

    const response = await handleGetExternalRentalById(
      createMockNextRequest(),
      AGREEMENT_ID,
      () => services as unknown as ExternalRentalApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  // Ownership isolation: create/confirm handlers only call application services
  // (no inventory). Asserted at application layer in create-list tests / f01-f02.
  it("create handler only invokes createExternalRental service", async () => {
    const services = createMockServices();
    services.createExternalRental.execute.mockResolvedValue(createMockDto());

    await handleCreateExternalRental(
      createMockNextRequest({ method: "POST", json: VALID_CREATE_INPUT }),
      () => services as unknown as ExternalRentalApplicationServices,
    );

    expect(services.createExternalRental.execute).toHaveBeenCalledTimes(1);
    expect(services.confirmExternalRental.execute).not.toHaveBeenCalled();
    expect(PRODUCT_ID).toBeTruthy();
  });
});
