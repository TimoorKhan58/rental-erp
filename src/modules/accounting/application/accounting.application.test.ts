import { describe, expect, it } from "vitest";

import { CreateAccountService } from "@/modules/accounting/application/services/create-account.service";
import { GetAccountByIdService } from "@/modules/accounting/application/services/get-account-by-id.service";
import { ListAccountsService } from "@/modules/accounting/application/services/list-accounts.service";
import { UpdateAccountService } from "@/modules/accounting/application/services/update-account.service";
import { CreateJournalEntryService } from "@/modules/accounting/application/services/create-journal-entry.service";
import { GetJournalEntryByIdService } from "@/modules/accounting/application/services/get-journal-entry-by-id.service";
import { ListJournalEntriesService } from "@/modules/accounting/application/services/list-journal-entries.service";
import { UpdateJournalEntryService } from "@/modules/accounting/application/services/update-journal-entry.service";
import { PostJournalEntryService } from "@/modules/accounting/application/services/post-journal-entry.service";
import { VoidJournalEntryService } from "@/modules/accounting/application/services/void-journal-entry.service";
import {
  ACCOUNT_ENTITY_NAME,
  ACCOUNT_MODULE,
  JOURNAL_ENTRY_ENTITY_NAME,
  JOURNAL_ENTRY_MODULE,
} from "@/modules/accounting/application/services/accounting-service.constants";
import type { CreateAccountInput } from "@/modules/accounting/application/schemas/account.schemas";
import type { CreateJournalEntryInput } from "@/modules/accounting/application/schemas/journal-entry.schemas";
import { ListAccountsSchema } from "@/modules/accounting/application/schemas/list-accounts.schema";
import type { AuditEntry } from "@/shared/infrastructure/audit/audit-logger.interface";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import { InMemoryAccountRepository } from "../tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "../tests/helpers/in-memory-journal-entry.repository";
import {
  ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  OTHER_ACCOUNT_ID,
  USER_ID,
  VALID_CREATE_ACCOUNT_INPUT,
  buildAccountEntity,
  buildCashAccountEntity,
  buildInactiveAccountEntity,
} from "../tests/helpers/account.fixtures";
import {
  JOURNAL_ENTRY_ID,
  OTHER_JOURNAL_ENTRY_ID,
  VALID_CREATE_JOURNAL_INPUT,
  buildJournalEntryEntity,
  buildPostedJournalEntryEntity,
  buildVoidJournalEntryEntity,
} from "../tests/helpers/journal-entry.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

class ThrowingAuditLogger extends MockAuditLogger {
  async log(_entry: AuditEntry): Promise<void> {
    throw new Error("Audit failure");
  }
}

const VALID_CREATE_ACCOUNT_SERVICE_INPUT =
  VALID_CREATE_ACCOUNT_INPUT as unknown as CreateAccountInput;

const VALID_CREATE_JOURNAL_SERVICE_INPUT =
  VALID_CREATE_JOURNAL_INPUT as unknown as CreateJournalEntryInput;

function createDefaultTestScope(
  auditLogger: MockAuditLogger = new MockAuditLogger(),
  userId: string | undefined = USER_ID,
) {
  const accountRepository = new InMemoryAccountRepository();
  const journalEntryRepository = new InMemoryJournalEntryRepository();
  accountRepository.seed([
    buildAccountEntity(),
    buildCashAccountEntity(),
  ]);

  return {
    accountRepository,
    journalEntryRepository,
    auditLogger,
    transactionRunner: createPassThroughTransactionRunner({
      accountRepository,
      journalEntryRepository,
      auditLogger,
      userId,
    }),
  };
}

describe("CreateAccountService", () => {
  it("creates an account and returns a DTO", async () => {
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const auditLogger = new MockAuditLogger();
    const transactionRunner = createPassThroughTransactionRunner({
      accountRepository,
      journalEntryRepository,
      auditLogger,
      userId: USER_ID,
    });
    const service = new CreateAccountService(transactionRunner);

    const result = await service.execute(VALID_CREATE_ACCOUNT_SERVICE_INPUT);

    expect(result.accountCode).toBe("1000");
    expect(result.name).toBe("Cash");
    expect(result.isActive).toBe(true);
    expect(accountRepository.count()).toBe(1);
  });

  it("rejects duplicate account code", async () => {
    const { transactionRunner, accountRepository } = createDefaultTestScope();
    accountRepository.seed([buildAccountEntity()]);
    const service = new CreateAccountService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_ACCOUNT_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateAccountService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_ACCOUNT_SERVICE_INPUT,
        name: "",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner } = createDefaultTestScope(auditLogger);
    const service = new CreateAccountService(transactionRunner);

    await service.execute({
      ...VALID_CREATE_ACCOUNT_SERVICE_INPUT,
      accountCode: "1500",
    });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: ACCOUNT_MODULE,
      entityName: ACCOUNT_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rolls back create changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const service = new CreateAccountService(
      createRollbackTransactionRunner(
        accountRepository,
        journalEntryRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_ACCOUNT_SERVICE_INPUT,
        accountCode: "1500",
      }),
    ).rejects.toThrow("Audit failure");

    expect(accountRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("UpdateAccountService", () => {
  it("updates account fields", async () => {
    const { transactionRunner, accountRepository } = createDefaultTestScope();
    accountRepository.seed([buildAccountEntity()]);
    const service = new UpdateAccountService(transactionRunner);

    const result = await service.execute(
      { id: ACCOUNT_ID },
      { name: "Updated Cash" },
    );

    expect(result.name).toBe("Updated Cash");
  });

  it("throws when account does not exist", async () => {
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const service = new UpdateAccountService(
      createPassThroughTransactionRunner({
        accountRepository,
        journalEntryRepository,
        auditLogger: new MockAuditLogger(),
        userId: USER_ID,
      }),
    );

    await expect(
      service.execute({ id: ACCOUNT_ID }, { name: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on update", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, accountRepository } =
      createDefaultTestScope(auditLogger);
    accountRepository.seed([buildAccountEntity()]);
    const service = new UpdateAccountService(transactionRunner);

    await service.execute({ id: ACCOUNT_ID }, { name: "Updated Cash" });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });

  it("rejects invalid update input", async () => {
    const { transactionRunner, accountRepository } = createDefaultTestScope();
    accountRepository.seed([buildAccountEntity()]);
    const service = new UpdateAccountService(transactionRunner);

    await expect(
      service.execute({ id: ACCOUNT_ID }, {}),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rolls back update changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    accountRepository.seed([buildAccountEntity()]);
    const service = new UpdateAccountService(
      createRollbackTransactionRunner(
        accountRepository,
        journalEntryRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: ACCOUNT_ID }, { name: "Updated Cash" }),
    ).rejects.toThrow("Audit failure");

    const account = await accountRepository.findById(ACCOUNT_ID);
    expect(account?.name).toBe("Cash");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetAccountByIdService", () => {
  it("returns account DTO by id", async () => {
    const accountRepository = new InMemoryAccountRepository();
    accountRepository.seed([buildAccountEntity()]);
    const service = new GetAccountByIdService(accountRepository);

    const result = await service.execute({ id: ACCOUNT_ID });

    expect(result.id).toBe(ACCOUNT_ID);
    expect(result.accountCode).toBe("1000");
  });

  it("throws when account does not exist", async () => {
    const service = new GetAccountByIdService(new InMemoryAccountRepository());

    await expect(
      service.execute({ id: ACCOUNT_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListAccountsService", () => {
  it("returns paginated account DTOs", async () => {
    const accountRepository = new InMemoryAccountRepository();
    accountRepository.seed([
      buildAccountEntity(),
      buildCashAccountEntity(),
    ]);
    const service = new ListAccountsService(accountRepository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it("filters by account type", async () => {
    const accountRepository = new InMemoryAccountRepository();
    accountRepository.seed([
      buildAccountEntity(),
      buildInactiveAccountEntity(),
    ]);
    const service = new ListAccountsService(accountRepository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      accountType: "EXPENSE",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.accountType).toBe("EXPENSE");
  });

  it("filters by isActive", async () => {
    const accountRepository = new InMemoryAccountRepository();
    accountRepository.seed([
      buildAccountEntity(),
      buildInactiveAccountEntity(),
    ]);
    const service = new ListAccountsService(accountRepository);

    const result = await service.execute(
      ListAccountsSchema.parse({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
        isActive: false,
      }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isActive).toBe(false);
  });
});

describe("CreateJournalEntryService", () => {
  it("creates a journal entry and returns a DTO", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    const service = new CreateJournalEntryService(transactionRunner);

    const result = await service.execute(VALID_CREATE_JOURNAL_SERVICE_INPUT);

    expect(result.journalNumber).toBe("JE-2026-001");
    expect(result.status).toBe("DRAFT");
    expect(result.lines).toHaveLength(2);
    expect(journalEntryRepository.count()).toBe(1);
  });

  it("rejects duplicate journal number", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new CreateJournalEntryService(transactionRunner);

    await expect(
      service.execute(VALID_CREATE_JOURNAL_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateJournalEntryService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_JOURNAL_SERVICE_INPUT,
        description: "",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects inactive account on lines", async () => {
    const { transactionRunner, accountRepository } = createDefaultTestScope();
    accountRepository.seed([
      buildInactiveAccountEntity(),
      buildCashAccountEntity(),
    ]);
    const service = new CreateJournalEntryService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_JOURNAL_SERVICE_INPUT,
        lines: [
          {
            accountId: OTHER_ACCOUNT_ID,
            debit: 500,
            credit: 0,
          },
          {
            accountId: CASH_ACCOUNT_ID,
            debit: 0,
            credit: 500,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects missing account on lines", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateJournalEntryService(transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_JOURNAL_SERVICE_INPUT,
        lines: [
          {
            accountId: "dd0e8400-e29b-41d4-a716-446655440099",
            debit: 500,
            credit: 0,
          },
          {
            accountId: CASH_ACCOUNT_ID,
            debit: 0,
            credit: 500,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects without user context", async () => {
    const auditLogger = new MockAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    accountRepository.seed([
      buildAccountEntity(),
      buildCashAccountEntity(),
    ]);
    const service = new CreateJournalEntryService(
      createPassThroughTransactionRunner({
        accountRepository,
        journalEntryRepository,
        auditLogger,
        userId: undefined,
      }),
    );

    await expect(
      service.execute(VALID_CREATE_JOURNAL_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner } = createDefaultTestScope(auditLogger);
    const service = new CreateJournalEntryService(transactionRunner);

    await service.execute(VALID_CREATE_JOURNAL_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: JOURNAL_ENTRY_MODULE,
      entityName: JOURNAL_ENTRY_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rolls back create changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    accountRepository.seed([
      buildAccountEntity(),
      buildCashAccountEntity(),
    ]);
    const service = new CreateJournalEntryService(
      createRollbackTransactionRunner(
        accountRepository,
        journalEntryRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_JOURNAL_SERVICE_INPUT),
    ).rejects.toThrow("Audit failure");

    expect(journalEntryRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("UpdateJournalEntryService", () => {
  it("updates draft journal entry", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new UpdateJournalEntryService(transactionRunner);

    const result = await service.execute(
      { id: JOURNAL_ENTRY_ID },
      { description: "Updated entry" },
    );

    expect(result.description).toBe("Updated entry");
  });

  it("rejects update when not draft", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildPostedJournalEntryEntity()]);
    const service = new UpdateJournalEntryService(transactionRunner);

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }, { description: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when journal entry does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new UpdateJournalEntryService(transactionRunner);

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }, { description: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects inactive account when updating lines", async () => {
    const { transactionRunner, accountRepository, journalEntryRepository } =
      createDefaultTestScope();
    accountRepository.seed([
      buildAccountEntity(),
      buildInactiveAccountEntity(),
      buildCashAccountEntity(),
    ]);
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new UpdateJournalEntryService(transactionRunner);

    await expect(
      service.execute(
        { id: JOURNAL_ENTRY_ID },
        {
          lines: [
            {
              accountId: OTHER_ACCOUNT_ID,
              debit: 500,
              credit: 0,
            },
            {
              accountId: CASH_ACCOUNT_ID,
              debit: 0,
              credit: 500,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("writes audit log on update", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope(auditLogger);
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new UpdateJournalEntryService(transactionRunner);

    await service.execute(
      { id: JOURNAL_ENTRY_ID },
      { description: "Updated entry" },
    );

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });

  it("rejects invalid update input", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new UpdateJournalEntryService(transactionRunner);

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }, {}),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rolls back update changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    accountRepository.seed([
      buildAccountEntity(),
      buildCashAccountEntity(),
    ]);
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new UpdateJournalEntryService(
      createRollbackTransactionRunner(
        accountRepository,
        journalEntryRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: JOURNAL_ENTRY_ID },
        { description: "Updated entry" },
      ),
    ).rejects.toThrow("Audit failure");

    const entry = await journalEntryRepository.findById(JOURNAL_ENTRY_ID);
    expect(entry?.description).toBe("Opening balance entry");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("PostJournalEntryService", () => {
  it("posts draft journal entry", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new PostJournalEntryService(transactionRunner);

    const result = await service.execute({ id: JOURNAL_ENTRY_ID });

    expect(result.status).toBe("POSTED");
    expect(result.postedAt).not.toBeNull();
    expect(result.postedById).toBe(USER_ID);
  });

  it("rejects post when not draft", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildPostedJournalEntryEntity()]);
    const service = new PostJournalEntryService(transactionRunner);

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when journal entry does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new PostJournalEntryService(transactionRunner);

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects without user context", async () => {
    const auditLogger = new MockAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new PostJournalEntryService(
      createPassThroughTransactionRunner({
        accountRepository,
        journalEntryRepository,
        auditLogger,
        userId: undefined,
      }),
    );

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("writes audit log on post", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope(auditLogger);
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new PostJournalEntryService(transactionRunner);

    await service.execute({ id: JOURNAL_ENTRY_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: JOURNAL_ENTRY_MODULE,
      action: "APPROVE",
    });
  });

  it("rolls back post changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new PostJournalEntryService(
      createRollbackTransactionRunner(
        accountRepository,
        journalEntryRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toThrow("Audit failure");

    const entry = await journalEntryRepository.findById(JOURNAL_ENTRY_ID);
    expect(entry?.status).toBe("DRAFT");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("VoidJournalEntryService", () => {
  it("voids draft journal entry", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new VoidJournalEntryService(transactionRunner);

    const result = await service.execute({ id: JOURNAL_ENTRY_ID });

    expect(result.status).toBe("VOID");
    expect(result.voidedAt).not.toBeNull();
  });

  it("voids posted journal entry", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildPostedJournalEntryEntity()]);
    const service = new VoidJournalEntryService(transactionRunner);

    const result = await service.execute({ id: JOURNAL_ENTRY_ID });

    expect(result.status).toBe("VOID");
    expect(result.postedAt).not.toBeNull();
    expect(result.voidedAt).not.toBeNull();
  });

  it("rejects void when already void", async () => {
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope();
    journalEntryRepository.seed([buildVoidJournalEntryEntity()]);
    const service = new VoidJournalEntryService(transactionRunner);

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when journal entry does not exist", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new VoidJournalEntryService(transactionRunner);

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on void", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner, journalEntryRepository } =
      createDefaultTestScope(auditLogger);
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new VoidJournalEntryService(transactionRunner);

    await service.execute({ id: JOURNAL_ENTRY_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: JOURNAL_ENTRY_MODULE,
      action: "CANCEL",
    });
  });

  it("rolls back void changes on audit failure", async () => {
    const auditLogger = new ThrowingAuditLogger();
    const accountRepository = new InMemoryAccountRepository();
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new VoidJournalEntryService(
      createRollbackTransactionRunner(
        accountRepository,
        journalEntryRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toThrow("Audit failure");

    const entry = await journalEntryRepository.findById(JOURNAL_ENTRY_ID);
    expect(entry?.status).toBe("DRAFT");
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetJournalEntryByIdService", () => {
  it("returns journal entry DTO by id", async () => {
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    journalEntryRepository.seed([buildJournalEntryEntity()]);
    const service = new GetJournalEntryByIdService(journalEntryRepository);

    const result = await service.execute({ id: JOURNAL_ENTRY_ID });

    expect(result.id).toBe(JOURNAL_ENTRY_ID);
    expect(result.journalNumber).toBe("JE-2026-001");
  });

  it("throws when journal entry does not exist", async () => {
    const service = new GetJournalEntryByIdService(
      new InMemoryJournalEntryRepository(),
    );

    await expect(
      service.execute({ id: JOURNAL_ENTRY_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListJournalEntriesService", () => {
  it("returns paginated journal entry DTOs", async () => {
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    journalEntryRepository.seed([
      buildJournalEntryEntity(),
      buildJournalEntryEntity({ id: OTHER_JOURNAL_ENTRY_ID }),
    ]);
    const service = new ListJournalEntriesService(journalEntryRepository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it("filters by status", async () => {
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    journalEntryRepository.seed([
      buildJournalEntryEntity(),
      buildPostedJournalEntryEntity(),
    ]);
    const service = new ListJournalEntriesService(journalEntryRepository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "POSTED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("POSTED");
  });
});
