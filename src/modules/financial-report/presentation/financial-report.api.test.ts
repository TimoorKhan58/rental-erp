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
import type { FinancialReportApplicationServices } from "@/modules/financial-report/application/services/financial-report-application-services.interface";
import { runFinancialReportApiRoute } from "@/modules/financial-report/presentation/http/financial-report-api.route-runner";
import {
  handleGetAccountLedger,
  handleGetAccountsSummary,
  handleGetBalanceSheet,
  handleGetCashFlowSummary,
  handleGetExpenseSummary,
  handleGetGeneralLedger,
  handleGetJournalReport,
  handleGetProfitLoss,
  handleGetRevenueSummary,
  handleGetTrialBalance,
} from "@/modules/financial-report/presentation/routes/financial-report-api.routes";
import { createMockNextRequest } from "@/modules/dispatch/tests/helpers/api-request.factory";

import { CASH_ACCOUNT_ID } from "../tests/helpers/financial-report.fixtures";

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
    getTrialBalance: { execute: vi.fn().mockResolvedValue({ isBalanced: true }) },
    getBalanceSheet: { execute: vi.fn().mockResolvedValue({ isBalanced: true }) },
    getProfitLoss: { execute: vi.fn().mockResolvedValue({ netProfit: 0 }) },
    getGeneralLedger: { execute: vi.fn().mockResolvedValue({ entries: [] }) },
    getAccountLedger: { execute: vi.fn().mockResolvedValue({ entries: [] }) },
    getJournalReport: { execute: vi.fn().mockResolvedValue({ items: [] }) },
    getCashFlowSummary: {
      execute: vi.fn().mockResolvedValue({ netCashChange: 0 }),
    },
    getRevenueSummary: {
      execute: vi.fn().mockResolvedValue({ totalRevenue: 0 }),
    },
    getExpenseSummary: {
      execute: vi.fn().mockResolvedValue({ totalExpenses: 0 }),
    },
    getAccountsSummary: {
      execute: vi.fn().mockResolvedValue({ totalAccounts: 0 }),
    },
  };
}

describe("runFinancialReportApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runFinancialReportApiRoute({
      request: createMockNextRequest(),
      route: "/api/financial-reports/trial-balance",
      httpMethod: "GET",
      permission: PERMISSIONS.financialReports.read,
      resolveServices: () =>
        createMockServices() as unknown as FinancialReportApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when worker lacks financial reports read", async () => {
    mockSession(USER_ROLES.WORKER);

    const result = await runFinancialReportApiRoute({
      request: createMockNextRequest(),
      route: "/api/financial-reports/trial-balance",
      httpMethod: "GET",
      permission: PERMISSIONS.financialReports.read,
      resolveServices: () =>
        createMockServices() as unknown as FinancialReportApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when viewer has financial reports read", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runFinancialReportApiRoute({
      request: createMockNextRequest(),
      route: "/api/financial-reports/trial-balance",
      httpMethod: "GET",
      permission: PERMISSIONS.financialReports.read,
      resolveServices: () =>
        createMockServices() as unknown as FinancialReportApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("returns 200 when accountant has financial reports read", async () => {
    mockSession(USER_ROLES.ACCOUNTANT);

    const result = await runFinancialReportApiRoute({
      request: createMockNextRequest(),
      route: "/api/financial-reports/balance-sheet",
      httpMethod: "GET",
      permission: PERMISSIONS.financialReports.read,
      resolveServices: () =>
        createMockServices() as unknown as FinancialReportApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("maps not found errors", async () => {
    mockSession(USER_ROLES.OWNER);

    const result = await runFinancialReportApiRoute({
      request: createMockNextRequest(),
      route: "/api/financial-reports/account-ledger",
      httpMethod: "GET",
      permission: PERMISSIONS.financialReports.read,
      resolveServices: () =>
        createMockServices() as unknown as FinancialReportApplicationServices,
      handler: async () => {
        throw new NotFoundError({ message: "Account not found" });
      },
    });

    expect(result.status).toBe(404);
  });
});

describe("financial report API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.ACCOUNTANT);
  });

  it("handles trial balance", async () => {
    const services = createMockServices();
    const response = await handleGetTrialBalance(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/trial-balance",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
    expect(services.getTrialBalance.execute).toHaveBeenCalled();
  });

  it("handles balance sheet", async () => {
    const services = createMockServices();
    const response = await handleGetBalanceSheet(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/balance-sheet?asOfDate=2026-01-31",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
    expect(services.getBalanceSheet.execute).toHaveBeenCalled();
  });

  it("handles profit loss", async () => {
    const services = createMockServices();
    const response = await handleGetProfitLoss(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/profit-loss",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles general ledger", async () => {
    const services = createMockServices();
    const response = await handleGetGeneralLedger(
      createMockNextRequest({
        url: `http://localhost/api/financial-reports/general-ledger?accountId=${CASH_ACCOUNT_ID}`,
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles account ledger", async () => {
    const services = createMockServices();
    const response = await handleGetAccountLedger(
      createMockNextRequest({
        url: `http://localhost/api/financial-reports/account-ledger?accountId=${CASH_ACCOUNT_ID}&page=1`,
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles journal report", async () => {
    const services = createMockServices();
    const response = await handleGetJournalReport(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/journals?status=POSTED",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles cash flow", async () => {
    const services = createMockServices();
    const response = await handleGetCashFlowSummary(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/cash-flow",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles revenue", async () => {
    const services = createMockServices();
    const response = await handleGetRevenueSummary(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/revenue",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles expenses", async () => {
    const services = createMockServices();
    const response = await handleGetExpenseSummary(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/expenses",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });

  it("handles accounts summary", async () => {
    const services = createMockServices();
    const response = await handleGetAccountsSummary(
      createMockNextRequest({
        url: "http://localhost/api/financial-reports/accounts",
      }),
      () => services as unknown as FinancialReportApplicationServices,
    );
    expect(response.status).toBe(200);
  });
});
