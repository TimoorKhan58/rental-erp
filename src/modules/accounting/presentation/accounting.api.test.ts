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
import type { AccountingApplicationServices } from "@/modules/accounting/application/services/accounting-application-services.interface";

import { runAccountingApiRoute } from "@/modules/accounting/presentation/http/accounting-api.route-runner";
import { createMockNextRequest } from "@/modules/dispatch/tests/helpers/api-request.factory";
import {
  ACCOUNT_ID,
  VALID_CREATE_ACCOUNT_INPUT,
} from "@/modules/accounting/tests/helpers/account.fixtures";
import {
  JOURNAL_ENTRY_ID,
  VALID_CREATE_JOURNAL_INPUT,
} from "@/modules/accounting/tests/helpers/journal-entry.fixtures";

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
    getAccountById: { execute: vi.fn() },
    listAccounts: { execute: vi.fn() },
    createAccount: { execute: vi.fn() },
    updateAccount: { execute: vi.fn() },
    getJournalEntryById: { execute: vi.fn() },
    listJournalEntries: { execute: vi.fn() },
    createJournalEntry: { execute: vi.fn() },
    updateJournalEntry: { execute: vi.fn() },
    postJournalEntry: { execute: vi.fn() },
    voidJournalEntry: { execute: vi.fn() },
  };
}

describe("runAccountingApiRoute authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: "/api/accounts",
      httpMethod: "GET",
      permission: PERMISSIONS.accounts.read,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.UNAUTHORIZED },
    });
  });

  it("returns 403 when accounts create permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: "/api/accounts",
      httpMethod: "POST",
      permission: PERMISSIONS.accounts.create,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.FORBIDDEN },
    });
  });

  it("returns 200 when accounts read permission is granted", async () => {
    mockSession(USER_ROLES.MANAGER);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: "/api/accounts",
      httpMethod: "GET",
      permission: PERMISSIONS.accounts.read,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });

  it("returns 403 when journal entries post permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: `/api/journal-entries/${JOURNAL_ENTRY_ID}/post`,
      httpMethod: "POST",
      permission: PERMISSIONS.journalEntries.post,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("returns 403 when journal entries void permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: `/api/journal-entries/${JOURNAL_ENTRY_ID}/void`,
      httpMethod: "POST",
      permission: PERMISSIONS.journalEntries.void,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("viewer role can read journal entries", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: "/api/journal-entries",
      httpMethod: "GET",
      permission: PERMISSIONS.journalEntries.read,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(200);
  });
});

describe("accounting route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ROLES.MANAGER);
  });

  it("list accounts handler returns list envelope", async () => {
    const services = createMockServices();
    services.listAccounts.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: "/api/accounts",
      httpMethod: "GET",
      permission: PERMISSIONS.accounts.read,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.listAccounts.execute({
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

  it("create account handler returns created account", async () => {
    const services = createMockServices();
    services.createAccount.execute.mockResolvedValue({
      id: ACCOUNT_ID,
      ...VALID_CREATE_ACCOUNT_INPUT,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_ACCOUNT_INPUT,
      }),
      route: "/api/accounts",
      httpMethod: "POST",
      permission: PERMISSIONS.accounts.create,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.createAccount.execute(VALID_CREATE_ACCOUNT_INPUT as never),
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      data: { accountCode: "1000" },
    });
  });

  it("update account handler delegates to service", async () => {
    const services = createMockServices();
    services.updateAccount.execute.mockResolvedValue({
      id: ACCOUNT_ID,
      ...VALID_CREATE_ACCOUNT_INPUT,
      name: "Updated Cash",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { name: "Updated Cash" },
      }),
      route: `/api/accounts/${ACCOUNT_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.accounts.update,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.updateAccount.execute({ id: ACCOUNT_ID }, { name: "Updated Cash" }),
    });

    expect(result.status).toBe(200);
    expect(services.updateAccount.execute).toHaveBeenCalled();
  });

  it("list journal entries handler returns list envelope", async () => {
    const services = createMockServices();
    services.listJournalEntries.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: "/api/journal-entries",
      httpMethod: "GET",
      permission: PERMISSIONS.journalEntries.read,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.listJournalEntries.execute({
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

  it("create journal entry handler delegates to service", async () => {
    const services = createMockServices();
    services.createJournalEntry.execute.mockResolvedValue({
      id: JOURNAL_ENTRY_ID,
      ...VALID_CREATE_JOURNAL_INPUT,
      status: "DRAFT",
      postedAt: null,
      voidedAt: null,
      createdById: "user-1",
      postedById: null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_JOURNAL_INPUT,
      }),
      route: "/api/journal-entries",
      httpMethod: "POST",
      permission: PERMISSIONS.journalEntries.create,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.createJournalEntry.execute(VALID_CREATE_JOURNAL_INPUT as never),
    });

    expect(result.status).toBe(200);
    expect(services.createJournalEntry.execute).toHaveBeenCalled();
  });

  it("post journal entry handler delegates to service", async () => {
    const services = createMockServices();
    services.postJournalEntry.execute.mockResolvedValue({
      id: JOURNAL_ENTRY_ID,
      ...VALID_CREATE_JOURNAL_INPUT,
      status: "POSTED",
      postedAt: "2026-01-18T10:00:00.000Z",
      voidedAt: null,
      createdById: "user-1",
      postedById: "user-1",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/journal-entries/${JOURNAL_ENTRY_ID}/post`,
      httpMethod: "POST",
      permission: PERMISSIONS.journalEntries.post,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.postJournalEntry.execute({ id: JOURNAL_ENTRY_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.postJournalEntry.execute).toHaveBeenCalledWith({
      id: JOURNAL_ENTRY_ID,
    });
  });

  it("void journal entry handler delegates to service", async () => {
    const services = createMockServices();
    services.voidJournalEntry.execute.mockResolvedValue({
      id: JOURNAL_ENTRY_ID,
      ...VALID_CREATE_JOURNAL_INPUT,
      status: "VOID",
      postedAt: null,
      voidedAt: "2026-01-20T10:00:00.000Z",
      createdById: "user-1",
      postedById: null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/journal-entries/${JOURNAL_ENTRY_ID}/void`,
      httpMethod: "POST",
      permission: PERMISSIONS.journalEntries.void,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.voidJournalEntry.execute({ id: JOURNAL_ENTRY_ID }),
    });

    expect(result.status).toBe(200);
    expect(services.voidJournalEntry.execute).toHaveBeenCalledWith({
      id: JOURNAL_ENTRY_ID,
    });
  });

  it("returns 404 when account service throws NotFoundError", async () => {
    const services = createMockServices();
    services.getAccountById.execute.mockRejectedValue(
      new NotFoundError({ message: "Account not found" }),
    );

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: `/api/accounts/${ACCOUNT_ID}`,
      httpMethod: "GET",
      permission: PERMISSIONS.accounts.read,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.getAccountById.execute({ id: ACCOUNT_ID }),
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      error: { code: ERROR_CODES.NOT_FOUND },
    });
  });

  it("accountant role can create journal entries", async () => {
    mockSession(USER_ROLES.ACCOUNTANT);
    const services = createMockServices();
    services.createJournalEntry.execute.mockResolvedValue({
      id: JOURNAL_ENTRY_ID,
      ...VALID_CREATE_JOURNAL_INPUT,
      status: "DRAFT",
      postedAt: null,
      voidedAt: null,
      createdById: "user-1",
      postedById: null,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({
        method: "POST",
        json: VALID_CREATE_JOURNAL_INPUT,
      }),
      route: "/api/journal-entries",
      httpMethod: "POST",
      permission: PERMISSIONS.journalEntries.create,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.createJournalEntry.execute(VALID_CREATE_JOURNAL_INPUT as never),
    });

    expect(result.status).toBe(200);
  });

  it("returns 403 when accounts update permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { name: "Updated Cash" },
      }),
      route: `/api/accounts/${ACCOUNT_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.accounts.update,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("returns 403 when journal entries update permission is missing", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runAccountingApiRoute({
      request: createMockNextRequest({
        method: "PATCH",
        json: { description: "Updated" },
      }),
      route: `/api/journal-entries/${JOURNAL_ENTRY_ID}`,
      httpMethod: "PATCH",
      permission: PERMISSIONS.journalEntries.update,
      resolveServices: () =>
        createMockServices() as unknown as AccountingApplicationServices,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("viewer role can read accounts", async () => {
    mockSession(USER_ROLES.VIEWER);
    const services = createMockServices();
    services.listAccounts.execute.mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await runAccountingApiRoute({
      request: createMockNextRequest(),
      route: "/api/accounts",
      httpMethod: "GET",
      permission: PERMISSIONS.accounts.read,
      resolveServices: () =>
        services as unknown as AccountingApplicationServices,
      handler: async (_ctx, svc) =>
        svc.listAccounts.execute({
          page: 1,
          pageSize: 20,
          sortOrder: "desc",
        }),
    });

    expect(result.status).toBe(200);
  });
});
