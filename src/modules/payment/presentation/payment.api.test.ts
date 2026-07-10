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
import type { PaymentApplicationServices } from "@/modules/payment/application/services/payment-application-services.interface";

import { runPaymentApiRoute } from "@/modules/payment/presentation/http/payment-api.route-runner";
import { createMockNextRequest } from "@/modules/dispatch/tests/helpers/api-request.factory";
import {
  PAYMENT_ID,
  VALID_CREATE_INPUT,
} from "@/modules/payment/tests/helpers/payment.fixtures";

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
    getPaymentById: { execute: vi.fn() },
    listPayments: { execute: vi.fn() },
    createPayment: { execute: vi.fn() },
    updatePayment: { execute: vi.fn() },
    postPayment: { execute: vi.fn() },
    voidPayment: { execute: vi.fn() },
  };
}

describe("runPaymentApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: "/api/payments",
      httpMethod: "GET",
      permission: PERMISSIONS.payments.read,
      resolveServices: () =>
        createMockServices() as unknown as PaymentApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when read permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: "/api/payments",
      httpMethod: "POST",
      permission: PERMISSIONS.payments.create,
      resolveServices: () =>
        createMockServices() as unknown as PaymentApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when read permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: "/api/payments",
      httpMethod: "GET",
      permission: PERMISSIONS.payments.read,
      resolveServices: () =>
        createMockServices() as unknown as PaymentApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("returns 403 when post permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: `/api/payments/${PAYMENT_ID}/post`,
      httpMethod: "POST",
      permission: PERMISSIONS.payments.post,
      resolveServices: () =>
        createMockServices() as unknown as PaymentApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("returns 403 when void permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: `/api/payments/${PAYMENT_ID}/void`,
      httpMethod: "POST",
      permission: PERMISSIONS.payments.void,
      resolveServices: () =>
        createMockServices() as unknown as PaymentApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });
});

describe("payment route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("list handler returns list envelope", async () => {
    const services = createMockServices();
    services.listPayments.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: "/api/payments",
      httpMethod: "GET",
      permission: PERMISSIONS.payments.read,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.listPayments.execute({
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

  it("create handler returns created payment", async () => {
    const services = createMockServices();
    services.createPayment.execute.mockResolvedValue({
      id: PAYMENT_ID,
      ...VALID_CREATE_INPUT,
      status: "PENDING",
      postedAt: null,
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_INPUT,
      }),
      route: "/api/payments",
      httpMethod: "POST",
      permission: PERMISSIONS.payments.create,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.createPayment.execute(VALID_CREATE_INPUT as never),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { paymentNumber: "PAY-2026-001" },
    });
  });

  it("getById handler returns payment", async () => {
    const services = createMockServices();
    services.getPaymentById.execute.mockResolvedValue({
      id: PAYMENT_ID,
      ...VALID_CREATE_INPUT,
      status: "PENDING",
      postedAt: null,
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: `/api/payments/${PAYMENT_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.payments.read,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.getPaymentById.execute({ id: PAYMENT_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.getPaymentById.execute).toHaveBeenCalledWith({
      id: PAYMENT_ID,
    });
  });

  it("update handler delegates to service", async () => {
    const services = createMockServices();
    services.updatePayment.execute.mockResolvedValue({
      id: PAYMENT_ID,
      ...VALID_CREATE_INPUT,
      notes: "Updated",
      status: "PENDING",
      postedAt: null,
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { notes: "Updated" },
      }),
      route: `/api/payments/${PAYMENT_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.payments.update,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.updatePayment.execute({ id: PAYMENT_ID }, { notes: "Updated" }),
    });

    expect(result.status).toBe(200);
    expect(services.updatePayment.execute).toHaveBeenCalled();
  });

  it("post handler delegates to service", async () => {
    const services = createMockServices();
    services.postPayment.execute.mockResolvedValue({
      id: PAYMENT_ID,
      ...VALID_CREATE_INPUT,
      status: "POSTED",
      postedAt: "2026-01-18T10:00:00.000Z",
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/payments/${PAYMENT_ID}/post`,
      httpMethod: "POST",
      permission: PERMISSIONS.payments.post,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.postPayment.execute({ id: PAYMENT_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.postPayment.execute).toHaveBeenCalledWith({
      id: PAYMENT_ID,
    });
  });

  it("void handler delegates to service", async () => {
    const services = createMockServices();
    services.voidPayment.execute.mockResolvedValue({
      id: PAYMENT_ID,
      ...VALID_CREATE_INPUT,
      status: "VOID",
      postedAt: null,
      voidedAt: "2026-01-20T10:00:00.000Z",
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/payments/${PAYMENT_ID}/void`,
      httpMethod: "POST",
      permission: PERMISSIONS.payments.void,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.voidPayment.execute({ id: PAYMENT_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.voidPayment.execute).toHaveBeenCalledWith({
      id: PAYMENT_ID,
    });
  });

  it("returns 404 when service throws NotFoundError", async () => {
    const services = createMockServices();
    services.getPaymentById.execute.mockRejectedValue(
      new NotFoundError({ message: "Payment not found" }),
    );

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: `/api/payments/${PAYMENT_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.payments.read,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.getPaymentById.execute({ id: PAYMENT_ID }),
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.NOT_FOUND },
    });
  });

  it("accountant role can create payments", async () => {
    mockSession(USER_ROLES.ACCOUNTANT);
    const services = createMockServices();
    services.createPayment.execute.mockResolvedValue({
      id: PAYMENT_ID,
      ...VALID_CREATE_INPUT,
      status: "PENDING",
      postedAt: null,
      voidedAt: null,
      createdById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_INPUT,
      }),
      route: "/api/payments",
      httpMethod: "POST",
      permission: PERMISSIONS.payments.create,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.createPayment.execute(VALID_CREATE_INPUT as never),
    });

    expect(result.status).toBe(200);
  });

  it("returns 403 when update permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runPaymentApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { notes: "Updated" },
      }),
      route: `/api/payments/${PAYMENT_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.payments.update,
      resolveServices: () =>
        createMockServices() as unknown as PaymentApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("viewer role can read payments", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listPayments.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runPaymentApiRoute({
      request: createMockNextRequest(),
      route: "/api/payments",
      httpMethod: "GET",
      permission: PERMISSIONS.payments.read,
      resolveServices: () =>
        services as unknown as PaymentApplicationServices,
      handler: async (_ctx, svc) =>
        svc.listPayments.execute({
          page: 1,
          pageSize: 20,
          sortOrder: "desc",
        }),
    });

    expect(result.status).toBe(200);
  });
});
