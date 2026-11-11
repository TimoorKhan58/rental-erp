import { describe, expect, it } from "vitest";

import { MockAuditLogger } from "@/modules/customer/tests/helpers/mock-audit-logger";
import { Expense } from "@/modules/expense/domain/expense.entity";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { mockNotificationDb } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import { NoOpExpenseAccountingHook } from "./services/expense-accounting.hook";
import { ApproveExpenseService } from "./services/approve-expense.service";
import { RejectExpenseService } from "./services/reject-expense.service";
import { SubmitExpenseService } from "./services/submit-expense.service";
import {
  EXPENSE_CATEGORY_ID,
  EXPENSE_ID,
  USER_ID,
} from "../tests/helpers/expense.fixtures";
import { InMemoryExpenseRepository } from "../tests/helpers/in-memory-expense.repository";
import {
  createMinimalExpenseWriteScope,
  createPassThroughTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function buildDraftExpense(): Expense {
  const now = new Date("2026-03-01T10:00:00.000Z");

  return Expense.reconstitute({
    id: EXPENSE_ID,
    expenseNumber: "EXP-2026-010",
    expenseDate: new Date("2026-03-01T00:00:00.000Z"),
    categoryId: EXPENSE_CATEGORY_ID,
    expenseType: "MANUAL",
    status: "DRAFT",
    amount: 100,
    paymentMethod: "CASH",
    supplierId: null,
    vendorName: "Vendor Co",
    description: "Draft expense",
    notes: null,
    attachmentRef: null,
    referenceNumber: null,
    rejectionReason: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    paidAt: null,
    journalEntryId: null,
    recordedById: USER_ID,
    approvedById: null,
    paidById: null,
    createdAt: now,
    updatedAt: now,
  });
}

function buildSubmittedExpense(): Expense {
  const draft = buildDraftExpense();
  const submitted = draft.withSubmitted();

  return Expense.reconstitute({
    ...submitted.toProps(),
    id: EXPENSE_ID,
  });
}

const noopAccountingHook = new NoOpExpenseAccountingHook();

function createWorkflowRunner(
  repository: InMemoryExpenseRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    ...createMinimalExpenseWriteScope(
      repository,
      auditLogger,
      noopAccountingHook,
      userId,
    ),
    db: mockNotificationDb,
  });
}

describe("SubmitExpenseService", () => {
  it("transitions DRAFT to SUBMITTED", async () => {
    const repository = new InMemoryExpenseRepository();
    repository.seed([buildDraftExpense()]);
    const auditLogger = new MockAuditLogger();
    const service = new SubmitExpenseService(
      createWorkflowRunner(repository, auditLogger),
    );

    const result = await service.execute({ id: EXPENSE_ID });

    expect(result.status).toBe("SUBMITTED");
    expect(result.submittedAt).not.toBeNull();
  });

  it("rejects submit when expense is not in DRAFT", async () => {
    const repository = new InMemoryExpenseRepository();
    repository.seed([buildSubmittedExpense()]);
    const auditLogger = new MockAuditLogger();
    const service = new SubmitExpenseService(
      createWorkflowRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("returns NotFoundError for missing expense", async () => {
    const repository = new InMemoryExpenseRepository();
    const auditLogger = new MockAuditLogger();
    const service = new SubmitExpenseService(
      createWorkflowRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ApproveExpenseService", () => {
  it("transitions SUBMITTED to APPROVED", async () => {
    const repository = new InMemoryExpenseRepository();
    repository.seed([buildSubmittedExpense()]);
    const auditLogger = new MockAuditLogger();
    const service = new ApproveExpenseService(
      createWorkflowRunner(repository, auditLogger, USER_ID),
    );

    const result = await service.execute({ id: EXPENSE_ID });

    expect(result.status).toBe("APPROVED");
    expect(result.approvedById).toBe(USER_ID);
  });

  it("requires user context", async () => {
    const repository = new InMemoryExpenseRepository();
    repository.seed([buildSubmittedExpense()]);
    const auditLogger = new MockAuditLogger();
    const service = new ApproveExpenseService(
      createWorkflowRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects approve from DRAFT", async () => {
    const repository = new InMemoryExpenseRepository();
    repository.seed([buildDraftExpense()]);
    const auditLogger = new MockAuditLogger();
    const service = new ApproveExpenseService(
      createWorkflowRunner(repository, auditLogger, USER_ID),
    );

    await expect(service.execute({ id: EXPENSE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });
});

describe("RejectExpenseService", () => {
  it("transitions SUBMITTED to REJECTED with reason", async () => {
    const repository = new InMemoryExpenseRepository();
    repository.seed([buildSubmittedExpense()]);
    const auditLogger = new MockAuditLogger();
    const service = new RejectExpenseService(
      createWorkflowRunner(repository, auditLogger, USER_ID),
    );

    const result = await service.execute(
      { id: EXPENSE_ID },
      { rejectionReason: "Missing receipt" },
    );

    expect(result.status).toBe("REJECTED");
    expect(result.rejectionReason).toBe("Missing receipt");
  });

  it("rejects transition from APPROVED", async () => {
    const repository = new InMemoryExpenseRepository();
    const approved = buildSubmittedExpense().withApproved(USER_ID);
    repository.seed([approved]);
    const auditLogger = new MockAuditLogger();
    const service = new RejectExpenseService(
      createWorkflowRunner(repository, auditLogger, USER_ID),
    );

    await expect(
      service.execute({ id: EXPENSE_ID }, { rejectionReason: "Too late" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});
