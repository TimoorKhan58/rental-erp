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
import type { ReportingApplicationServices } from "@/modules/reporting/application/services/reporting-application-services.interface";
import { runReportingApiRoute } from "@/modules/reporting/presentation/http/reporting-api.route-runner";
import {
  handleGetCustomerReport,
  handleGetDashboard,
  handleGetDispatchReport,
  handleGetInventoryReport,
  handleGetMaintenanceReport,
  handleGetProcurementReport,
  handleGetProductReport,
  handleGetRentalReport,
  handleGetRepairReport,
  handleGetReturnReport,
  handleGetSupplierReport,
  handleGetWarehouseReport,
} from "@/modules/reporting/presentation/routes/reporting-api.routes";
import { createMockNextRequest } from "@/modules/dispatch/tests/helpers/api-request.factory";

import { WAREHOUSE_ONE_ID } from "../tests/helpers/reporting.fixtures";

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
    getDashboard: { execute: vi.fn().mockResolvedValue({ totalCustomers: 0 }) },
    getInventoryReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getRentalReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getDispatchReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getReturnReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getRepairReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getMaintenanceReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getProcurementReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getCustomerReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getSupplierReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getWarehouseReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
    getProductReport: { execute: vi.fn().mockResolvedValue({ lines: [] }) },
  };
}

describe("runReportingApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runReportingApiRoute({
      request: createMockNextRequest(),
      route: "/api/reports/dashboard",
      httpMethod: "GET",
      permission: PERMISSIONS.reports.read,
      resolveServices: () =>
        createMockServices() as unknown as ReportingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when worker lacks reports read", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runReportingApiRoute({
      request: createMockNextRequest(),
      route: "/api/reports/dashboard",
      httpMethod: "GET",
      permission: PERMISSIONS.reports.read,
      resolveServices: () =>
        createMockServices() as unknown as ReportingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when viewer has reports read", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runReportingApiRoute({
      request: createMockNextRequest(),
      route: "/api/reports/dashboard",
      httpMethod: "GET",
      permission: PERMISSIONS.reports.read,
      resolveServices: () =>
        createMockServices() as unknown as ReportingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("returns 200 when accountant has reports read", async () => {
    mockSession(USER_ROLES.ACCOUNTANT);

    const result = await runReportingApiRoute({
      request: createMockNextRequest(),
      route: "/api/reports/inventory",
      httpMethod: "GET",
      permission: PERMISSIONS.reports.read,
      resolveServices: () =>
        createMockServices() as unknown as ReportingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("reporting API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.ACCOUNTANT);
  });

  it("handles dashboard", async () => {
    const services = createMockServices();
    const response = await handleGetDashboard(
      createMockNextRequest({
        url: "http://localhost/api/reports/dashboard",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
    expect(services.getDashboard.execute).toHaveBeenCalled();
  });

  it("handles inventory report", async () => {
    const services = createMockServices();
    const response = await handleGetInventoryReport(
      createMockNextRequest({
        url: `http://localhost/api/reports/inventory?warehouseId=${WAREHOUSE_ONE_ID}`,
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
    expect(services.getInventoryReport.execute).toHaveBeenCalled();
  });

  it("handles rental report", async () => {
    const services = createMockServices();
    const response = await handleGetRentalReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/rentals?status=CONFIRMED",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
    expect(services.getRentalReport.execute).toHaveBeenCalled();
  });

  it("handles dispatch report", async () => {
    const services = createMockServices();
    const response = await handleGetDispatchReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/dispatches",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles return report", async () => {
    const services = createMockServices();
    const response = await handleGetReturnReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/returns",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles repair report", async () => {
    const services = createMockServices();
    const response = await handleGetRepairReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/repairs",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles maintenance report", async () => {
    const services = createMockServices();
    const response = await handleGetMaintenanceReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/maintenance",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles procurement report", async () => {
    const services = createMockServices();
    const response = await handleGetProcurementReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/procurement",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles customer report", async () => {
    const services = createMockServices();
    const response = await handleGetCustomerReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/customers",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles supplier report", async () => {
    const services = createMockServices();
    const response = await handleGetSupplierReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/suppliers",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles warehouse report", async () => {
    const services = createMockServices();
    const response = await handleGetWarehouseReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/warehouses",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles product report", async () => {
    const services = createMockServices();
    const response = await handleGetProductReport(
      createMockNextRequest({
        url: "http://localhost/api/reports/products",
      }),
      () => services as unknown as ReportingApplicationServices,
    );
    expect(response.status).toBe(200);
    expect(services.getProductReport.execute).toHaveBeenCalled();
  });
});
