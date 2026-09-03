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

import { USER_ROLES } from "@/constants/roles";
import { PERMISSIONS } from "@/shared/application/authorization";
import { ERROR_CODES } from "@/shared/infrastructure/errors/error-codes";
import type { ExpenseApplicationServices } from "@/modules/expense/application/services/expense-application-services.interface";
import { runExpenseApiRoute } from "@/modules/expense/presentation/http/expense-api.route-runner";
import { handleGetExpenseSummary } from "@/modules/expense/presentation/routes/expense-api.routes";
import {
  createMockNextRequest,
  readJsonResponse,
} from "@/modules/expense/tests/helpers/api-request.factory";

function createMockServices() {
  return {
    getExpenseById: { execute: vi.fn() },
    listExpenses: { execute: vi.fn() },
    getExpenseSummary: { execute: vi.fn() },
    createExpense: { execute: vi.fn() },
    updateExpense: { execute: vi.fn() },
    submitExpense: { execute: vi.fn() },
    approveExpense: { execute: vi.fn() },
    rejectExpense: { execute: vi.fn() },
    payExpense: { execute: vi.fn() },
  };
}

describe("expense summary API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    mockUnauthenticatedUser();

    const result = await runExpenseApiRoute({
      request: createMockNextRequest({
        url: "http://localhost/api/expenses/summary",
      }),
      route: "/api/expenses/summary",
      httpMethod: "GET",
      permission: PERMISSIONS.expenses.read,
      resolveServices: () => createMockServices() as unknown as ExpenseApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("handleGetExpenseSummary returns summary envelope with read permission", async () => {
    mockSession(USER_ROLES.ACCOUNTANT);
    const services = createMockServices();
    services.getExpenseSummary.execute.mockResolvedValue({
      stats: {
        totalExpenses: 101,
        draftCount: 101,
        submittedCount: 0,
        approvedCount: 0,
        paidCount: 0,
        rejectedCount: 0,
        totalPaidAmount: 0,
        totalPendingAmount: 10_100,
      },
      statusCounts: {
        all: 101,
        DRAFT: 101,
        SUBMITTED: 0,
        APPROVED: 0,
        REJECTED: 0,
        PAID: 0,
      },
    });

    const response = await handleGetExpenseSummary(
      createMockNextRequest({ url: "http://localhost/api/expenses/summary" }),
      () => services as unknown as ExpenseApplicationServices,
    );
    const body = await readJsonResponse<{
      data: { stats: { totalExpenses: number } };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.stats.totalExpenses).toBe(101);
  });

  it("denies expense summary without expenses.read", async () => {
    mockSession(USER_ROLES.WORKER);

    const response = await handleGetExpenseSummary(
      createMockNextRequest({ url: "http://localhost/api/expenses/summary" }),
      () => createMockServices() as unknown as ExpenseApplicationServices,
    );
    const body = await readJsonResponse<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
