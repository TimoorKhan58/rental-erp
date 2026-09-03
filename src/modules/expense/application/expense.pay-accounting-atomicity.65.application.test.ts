import { describe, expect, it } from "vitest";

import { DEFAULT_ACCOUNT_CODES } from "@/modules/accounting/domain/default-account-codes.constants";
import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { buildAccountEntity, CASH_ACCOUNT_ID, OTHER_ACCOUNT_ID } from "@/modules/accounting/tests/helpers/account.fixtures";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import { ExpenseAccountingHook } from "@/modules/expense/application/services/expense-accounting.hook";
import { PayExpenseService } from "@/modules/expense/application/services/pay-expense.service";
import { USER_ROLES } from "@/constants/roles";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/shared/application/authorization";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import {
  buildApprovedExpenseEntity,
  EXPENSE_ID,
  USER_ID,
} from "../tests/helpers/expense.fixtures";
import { FailingJournalEntryRepository } from "../tests/helpers/failing-journal-entry.repository";
import {
  FailingExpenseRepository,
  InMemoryExpenseRepository,
} from "../tests/helpers/in-memory-expense.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createMinimalExpenseWriteScope,
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function seedOperationalAccounts(accountRepository: InMemoryAccountRepository) {
  accountRepository.seed([
    buildAccountEntity({
      id: CASH_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
      name: "Cash",
      accountType: "ASSET",
    }),
    buildAccountEntity({
      id: OTHER_ACCOUNT_ID,
      accountCode: DEFAULT_ACCOUNT_CODES.GENERAL_EXPENSE,
      name: "General Expense",
      accountType: "EXPENSE",
    }),
  ]);
}

function buildAccountingHook(
  journalEntryRepository: InMemoryJournalEntryRepository,
) {
  const accountRepository = new InMemoryAccountRepository();
  seedOperationalAccounts(accountRepository);

  return new ExpenseAccountingHook({
    accountRepository,
    journalEntryRepository,
    userId: USER_ID,
  });
}

function createPayExpenseService(
  expenseRepository: InMemoryExpenseRepository,
  journalEntryRepository: InMemoryJournalEntryRepository,
  auditLogger: MockAuditLogger,
  useRollback = false,
) {
  const buildScope = (
    repository: InMemoryExpenseRepository,
    journalRepository: InMemoryJournalEntryRepository,
    logger: MockAuditLogger,
  ) =>
    createMinimalExpenseWriteScope(
      repository,
      logger,
      buildAccountingHook(journalRepository),
      USER_ID,
    );

  const transactionRunner = useRollback
    ? createRollbackTransactionRunner(
        expenseRepository,
        journalEntryRepository,
        auditLogger,
        buildScope,
      )
    : createPassThroughTransactionRunner(
        buildScope(expenseRepository, journalEntryRepository, auditLogger),
      );

  return new PayExpenseService(transactionRunner);
}

describe("F-35-08 — expense pay accounting atomicity", () => {
  it("T65.1 successful payment persists expense state and journal", async () => {
    const expenseRepository = new InMemoryExpenseRepository();
    expenseRepository.seed([buildApprovedExpenseEntity()]);
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const auditLogger = new MockAuditLogger();

    const service = createPayExpenseService(
      expenseRepository,
      journalEntryRepository,
      auditLogger,
    );

    const result = await service.execute({ id: EXPENSE_ID });

    expect(result.status).toBe("PAID");
    expect(result.journalEntryId).not.toBeNull();

    const persisted = await expenseRepository.findById(EXPENSE_ID);
    expect(persisted?.status).toBe("PAID");
    expect(persisted?.journalEntryId).toBe(result.journalEntryId);

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "OTHER",
      referenceId: EXPENSE_ID,
    });

    expect(journals.items).toHaveLength(1);
    expect(journals.items[0]?.status).toBe("POSTED");
    expect(journals.items[0]?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ debit: 250, credit: 0 }),
        expect.objectContaining({ debit: 0, credit: 250 }),
      ]),
    );
  });

  it("T65.2 journal link persistence failure rolls back expense and journal", async () => {
    const expenseRepository = new FailingExpenseRepository(2);
    expenseRepository.seed([buildApprovedExpenseEntity()]);
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const auditLogger = new MockAuditLogger();

    const service = createPayExpenseService(
      expenseRepository,
      journalEntryRepository,
      auditLogger,
      true,
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toThrow(
      "Simulated expense persistence failure",
    );

    const persisted = await expenseRepository.findById(EXPENSE_ID);
    expect(persisted?.status).toBe("APPROVED");
    expect(persisted?.journalEntryId).toBeNull();

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "OTHER",
      referenceId: EXPENSE_ID,
    });

    expect(journals.items).toHaveLength(0);
  });

  it("T65.3 accounting failure rolls back persisted expense payment", async () => {
    const expenseRepository = new InMemoryExpenseRepository();
    expenseRepository.seed([buildApprovedExpenseEntity()]);
    const journalEntryRepository = new FailingJournalEntryRepository();
    const auditLogger = new MockAuditLogger();

    const service = createPayExpenseService(
      expenseRepository,
      journalEntryRepository,
      auditLogger,
      true,
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toThrow(
      "Simulated accounting failure",
    );

    const persisted = await expenseRepository.findById(EXPENSE_ID);
    expect(persisted?.status).toBe("APPROVED");
    expect(persisted?.paidAt).toBeNull();
    expect(persisted?.journalEntryId).toBeNull();
  });

  it("T65.4 validation failure leaves expense unpaid with no journal", async () => {
    const expenseRepository = new InMemoryExpenseRepository();
    expenseRepository.seed([
      buildApprovedExpenseEntity({ status: "PAID", paidAt: new Date() }),
    ]);
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const auditLogger = new MockAuditLogger();

    const service = createPayExpenseService(
      expenseRepository,
      journalEntryRepository,
      auditLogger,
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "OTHER",
      referenceId: EXPENSE_ID,
    });

    expect(journals.items).toHaveLength(0);
  });

  it("T65.5 repeated pay attempt does not create duplicate journals", async () => {
    const expenseRepository = new InMemoryExpenseRepository();
    expenseRepository.seed([buildApprovedExpenseEntity()]);
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const auditLogger = new MockAuditLogger();

    const service = createPayExpenseService(
      expenseRepository,
      journalEntryRepository,
      auditLogger,
    );

    await service.execute({ id: EXPENSE_ID });

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "OTHER",
      referenceId: EXPENSE_ID,
    });

    expect(journals.items).toHaveLength(1);
  });

  it("T65.6 WORKER cannot pay expenses under existing permissions", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(
      PERMISSIONS.expenses.pay,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(
      PERMISSIONS.expenses.pay,
    );
  });

  it("T65.7 initial persistence failure leaves expense unpaid with no journal", async () => {
    const expenseRepository = new FailingExpenseRepository(1);
    expenseRepository.seed([buildApprovedExpenseEntity()]);
    const journalEntryRepository = new InMemoryJournalEntryRepository();
    const auditLogger = new MockAuditLogger();

    const service = createPayExpenseService(
      expenseRepository,
      journalEntryRepository,
      auditLogger,
      true,
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toThrow(
      "Simulated expense persistence failure",
    );

    const persisted = await expenseRepository.findById(EXPENSE_ID);
    expect(persisted?.status).toBe("APPROVED");

    const journals = await journalEntryRepository.findPaged({
      page: 1,
      pageSize: 10,
      referenceType: "OTHER",
      referenceId: EXPENSE_ID,
    });

    expect(journals.items).toHaveLength(0);
  });
});
