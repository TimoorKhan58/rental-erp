import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/config/env", () => ({
  env: {
    NODE_ENV: "test",
    APP_NAME: "Rental ERP",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    LOG_LEVEL: "error",
    UPLOAD_STORAGE: "local",
    UPLOAD_PATH: "./uploads",
    ENABLE_EMAIL: false,
    ENABLE_SMS: false,
    TIMEZONE: "UTC",
  },
}));

import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { RentalInvoiceApplicationServices } from "@/modules/rental-invoice/application/services/rental-invoice-application-services.interface";

import { runRentalInvoiceApiRoute } from "@/modules/rental-invoice/presentation/http/rental-invoice-api.route-runner";
import { createMockNextRequest } from "@/modules/dispatch/tests/helpers/api-request.factory";
import {
  RENTAL_INVOICE_ID,
  VALID_CREATE_INPUT,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";

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
    getRentalInvoiceById: { execute: vi.fn() },
    listRentalInvoices: { execute: vi.fn() },
    createRentalInvoice: { execute: vi.fn() },
    updateRentalInvoice: { execute: vi.fn() },
    issueRentalInvoice: { execute: vi.fn() },
    voidRentalInvoice: { execute: vi.fn() },
  };
}

describe("runRentalInvoiceApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest(),
      route: "/api/rental-invoices",
      httpMethod: "GET",
      permission: PERMISSIONS.rentalInvoices.read,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest(),
      route: "/api/rental-invoices",
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.create,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest(),
      route: "/api/rental-invoices",
      httpMethod: "GET",
      permission: PERMISSIONS.rentalInvoices.read,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("rental invoice route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("list handler returns list envelope", async () => {
    const services = createMockServices();
    services.listRentalInvoices.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest(),
      route: "/api/rental-invoices",
      httpMethod: "GET",
      permission: PERMISSIONS.rentalInvoices.read,
      resolveServices: () =>
        services as unknown as RentalInvoiceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.listRentalInvoices.execute({
          page: 1,
          pageSize: 20,
          sortOrder: "desc",
        }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { items: [] },
    });
  });

  it("create handler returns created rental invoice", async () => {
    const services = createMockServices();
    services.createRentalInvoice.execute.mockResolvedValue({
      id: RENTAL_INVOICE_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      subtotal: 350,
      discount: 0,
      tax: 0,
      grandTotal: 350,
      paidAmount: 0,
      balance: 350,
      issuedAt: null,
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_INPUT,
      }),
      route: "/api/rental-invoices",
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.create,
      resolveServices: () =>
        services as unknown as RentalInvoiceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.createRentalInvoice.execute(VALID_CREATE_INPUT as never),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { invoiceNumber: "INV-2026-001" },
    });
  });

  it("getById handler returns rental invoice", async () => {
    const services = createMockServices();
    services.getRentalInvoiceById.execute.mockResolvedValue({
      id: RENTAL_INVOICE_ID,
      ...VALID_CREATE_INPUT,
      status: "DRAFT",
      subtotal: 350,
      discount: 0,
      tax: 0,
      grandTotal: 350,
      paidAmount: 0,
      balance: 350,
      issuedAt: null,
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest(),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.rentalInvoices.read,
      resolveServices: () =>
        services as unknown as RentalInvoiceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.getRentalInvoiceById.execute({ id: RENTAL_INVOICE_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.getRentalInvoiceById.execute).toHaveBeenCalledWith({
      id: RENTAL_INVOICE_ID,
    });
  });

  it("update handler delegates to service", async () => {
    const services = createMockServices();
    services.updateRentalInvoice.execute.mockResolvedValue({
      id: RENTAL_INVOICE_ID,
      ...VALID_CREATE_INPUT,
      notes: "Updated",
      status: "DRAFT",
      subtotal: 350,
      discount: 0,
      tax: 0,
      grandTotal: 350,
      paidAmount: 0,
      balance: 350,
      issuedAt: null,
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { notes: "Updated" },
      }),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.rentalInvoices.update,
      resolveServices: () =>
        services as unknown as RentalInvoiceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.updateRentalInvoice.execute(
          { id: RENTAL_INVOICE_ID },
          { notes: "Updated" },
        ),
    });

    expect(result.status).toBe(200);
    expect(services.updateRentalInvoice.execute).toHaveBeenCalled();
  });

  it("issue handler delegates to service", async () => {
    const services = createMockServices();
    services.issueRentalInvoice.execute.mockResolvedValue({
      id: RENTAL_INVOICE_ID,
      ...VALID_CREATE_INPUT,
      status: "ISSUED",
      subtotal: 350,
      discount: 0,
      tax: 0,
      grandTotal: 350,
      paidAmount: 0,
      balance: 350,
      issuedAt: "2026-01-18T10:00:00.000Z",
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    });

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}/issue`,
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.issue,
      resolveServices: () =>
        services as unknown as RentalInvoiceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.issueRentalInvoice.execute({ id: RENTAL_INVOICE_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.issueRentalInvoice.execute).toHaveBeenCalled();
  });

  it("void handler delegates to service", async () => {
    const services = createMockServices();
    services.voidRentalInvoice.execute.mockResolvedValue({
      id: RENTAL_INVOICE_ID,
      ...VALID_CREATE_INPUT,
      status: "VOID",
      subtotal: 350,
      discount: 0,
      tax: 0,
      grandTotal: 350,
      paidAmount: 0,
      balance: 350,
      issuedAt: "2026-01-18T10:00:00.000Z",
      voidedAt: "2026-01-20T10:00:00.000Z",
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}/void`,
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.void,
      resolveServices: () =>
        services as unknown as RentalInvoiceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.voidRentalInvoice.execute({ id: RENTAL_INVOICE_ID }),
    });

    expect(result.status).toBe(200);
  });

  it("returns error envelope when service throws", async () => {
    const services = createMockServices();
    services.getRentalInvoiceById.execute.mockRejectedValue(
      new NotFoundError({ message: "Rental invoice not found" }),
    );

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest(),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.rentalInvoices.read,
      resolveServices: () =>
        services as unknown as RentalInvoiceApplicationServices,
      handler: async (_ctx, svc) =>
        svc.getRentalInvoiceById.execute({ id: RENTAL_INVOICE_ID }),
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.NOT_FOUND },
    });
  });
});

describe("runRentalInvoiceApiRoute rental invoice permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows worker role to create rental invoice", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/rental-invoices",
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.create,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows accountant role to issue rental invoice", async () => {
    mockSession(USER_ROLES.ACCOUNTANT);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}/issue`,
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.issue,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("allows accountant role to void rental invoice", async () => {
    mockSession(USER_ROLES.ACCOUNTANT);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}/void`,
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.void,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("denies viewer role from creating rental invoice", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: "/api/rental-invoices",
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.create,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("denies viewer role from issuing rental invoice", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}/issue`,
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.issue,
      resolveServices: () =>
        createMockServices() as unknown as RentalInvoiceApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });
});
