import { describe, expect, it } from "vitest";

import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { Payment } from "@/modules/payment/domain/payment.entity";
import { PostPaymentService } from "@/modules/payment/application/services/post-payment.service";
import { InMemoryPaymentRepository } from "@/modules/payment/tests/helpers/in-memory-payment.repository";
import {
  PAYMENT_ID,
  USER_ID as PAYMENT_USER_ID,
  buildCreatePaymentData,
} from "@/modules/payment/tests/helpers/payment.fixtures";
import {
  createPassThroughTransactionRunner as createPaymentPassThroughRunner,
} from "@/modules/payment/tests/helpers/transaction-test-runner";
import { IssueRentalInvoiceService } from "@/modules/rental-invoice/application/services/issue-rental-invoice.service";
import { VoidRentalInvoiceService } from "@/modules/rental-invoice/application/services/void-rental-invoice.service";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import {
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { INotificationService } from "@/shared/infrastructure/notifications/notification-service.interface";
import type {
  NotificationPayload,
  NotificationResult,
} from "@/shared/infrastructure/notifications/notification-types";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  RENTAL_INVOICE_ID,
  USER_ID,
  buildIssuedRentalInvoiceEntity,
  buildPaidRentalInvoiceEntity,
  buildRentalInvoiceEntity,
} from "../tests/helpers/rental-invoice.fixtures";
import { InMemoryRentalInvoiceRepository } from "../tests/helpers/in-memory-rental-invoice.repository";
import {
  createCompletedRentalOrderLookup,
} from "../tests/helpers/in-memory-rental-order-invoice.lookup";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

class CountingNotificationService implements INotificationService {
  enqueueCount = 0;

  async enqueue(_payload: NotificationPayload): Promise<NotificationResult> {
    this.enqueueCount += 1;
    return {
      notificationId: "00000000-0000-4000-8000-000000000001",
      queuedAt: new Date(),
    };
  }

  async cancel(_notificationId: string): Promise<void> {
    // no-op
  }
}

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
}

function buildInvoiceRunner(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger,
  notificationService: INotificationService,
) {
  const customerRepository = new InMemoryCustomerRepository();
  customerRepository.seed([buildCustomerEntity()]);

  return createPassThroughTransactionRunner({
    rentalInvoiceRepository,
    paymentRepository: new InMemoryPaymentRepository(),
    rentalOrderRepository: new InMemoryRentalOrderRepository(),
    rentalOrderInvoiceLookup: createCompletedRentalOrderLookup(),
    customerRepository,
    accountRepository: new InMemoryAccountRepository(),
    journalEntryRepository: new InMemoryJournalEntryRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    notificationService,
    userId: USER_ID,
  });
}

function buildIssueService(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger,
  notificationService: INotificationService,
) {
  return new IssueRentalInvoiceService(
    buildInvoiceRunner(rentalInvoiceRepository, auditLogger, notificationService),
  );
}

function buildVoidService(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger,
  notificationService: INotificationService = mockNotificationWriteScopeDeps.notificationService,
) {
  return new VoidRentalInvoiceService(
    buildInvoiceRunner(rentalInvoiceRepository, auditLogger, notificationService),
  );
}

function buildPendingPayment(amount = 100): Payment {
  const created = Payment.create(
    buildCreatePaymentData({ paymentNumber: "PAY-T38-001", amount }),
  );
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Payment.reconstitute({
    id: PAYMENT_ID,
    ...created,
    createdAt: now,
    updatedAt: now,
  });
}

describe("Phase 38 F-35-06: rental invoice issue/void concurrency", () => {
  it("T38.1: Issue ∥ Issue — one success, one 409, single audit and notification", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const auditLogger = new MockAuditLogger();
    const notificationService = new CountingNotificationService();
    const issueService = buildIssueService(
      rentalInvoiceRepository,
      auditLogger,
      notificationService,
    );

    const results = await Promise.allSettled([
      issueService.execute({ id: RENTAL_INVOICE_ID }),
      issueService.execute({ id: RENTAL_INVOICE_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("ISSUED");
    expect(
      auditLogger.entries.filter((entry) => entry.action === "APPROVE"),
    ).toHaveLength(1);
    expect(notificationService.enqueueCount).toBe(1);
  });

  it("T38.2: Issue ∥ Void from DRAFT — exactly one winner, loser 409", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const auditLogger = new MockAuditLogger();
    const notificationService = new CountingNotificationService();
    const issueService = buildIssueService(
      rentalInvoiceRepository,
      auditLogger,
      notificationService,
    );
    const voidService = buildVoidService(
      rentalInvoiceRepository,
      auditLogger,
      notificationService,
    );

    const results = await Promise.allSettled([
      issueService.execute({ id: RENTAL_INVOICE_ID }),
      voidService.execute({ id: RENTAL_INVOICE_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled.length + rejected.length).toBe(2);

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    const approveAudits = auditLogger.entries.filter(
      (entry) => entry.action === "APPROVE",
    );
    const cancelAudits = auditLogger.entries.filter(
      (entry) => entry.action === "CANCEL",
    );

    if (fulfilled.length === 2) {
      expect(stored?.status).toBe("VOID");
      expect(approveAudits).toHaveLength(1);
      expect(cancelAudits).toHaveLength(1);
      expect(notificationService.enqueueCount).toBe(1);
      return;
    }

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    expect(stored?.status === "ISSUED" || stored?.status === "VOID").toBe(true);

    if (stored?.status === "ISSUED") {
      expect(approveAudits).toHaveLength(1);
      expect(cancelAudits).toHaveLength(0);
      expect(notificationService.enqueueCount).toBe(1);
    } else {
      expect(cancelAudits).toHaveLength(1);
      expect(approveAudits).toHaveLength(0);
      expect(notificationService.enqueueCount).toBe(0);
    }
  });

  it("T38.3: Void ∥ Void — one success, one 409, single void audit", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const auditLogger = new MockAuditLogger();
    const voidService = buildVoidService(
      rentalInvoiceRepository,
      auditLogger,
    );

    const results = await Promise.allSettled([
      voidService.execute({ id: RENTAL_INVOICE_ID }),
      voidService.execute({ id: RENTAL_INVOICE_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("VOID");
    expect(
      auditLogger.entries.filter((entry) => entry.action === "CANCEL"),
    ).toHaveLength(1);
  });

  it("T38.4: Void ∥ Post payment — one winner, loser 409, consistent money fields", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    const issued = buildIssuedRentalInvoiceEntity();
    rentalInvoiceRepository.seed([issued]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPendingPayment(100)]);

    const auditLogger = new MockAuditLogger();
    const voidService = buildVoidService(rentalInvoiceRepository, auditLogger);
    const postService = new PostPaymentService(
      createPaymentPassThroughRunner({
        paymentRepository,
        rentalInvoiceRepository,
        accountRepository: new InMemoryAccountRepository(),
        journalEntryRepository: new InMemoryJournalEntryRepository(),
        auditLogger,
        ...mockNotificationWriteScopeDeps,
        userId: PAYMENT_USER_ID,
      }),
    );

    const results = await Promise.allSettled([
      voidService.execute({ id: RENTAL_INVOICE_ID }),
      postService.execute({ id: PAYMENT_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const loser = (rejected[0] as PromiseRejectedResult).reason;
    expect(
      loser instanceof ConcurrentUpdateError ||
        loser instanceof UnprocessableError,
    ).toBe(true);

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored).not.toBeNull();

    if (stored!.status === "VOID") {
      expect(stored!.paidAmount).toBe(0);
      expect(stored!.balance).toBe(stored!.grandTotal);
    } else {
      expect(stored!.status).not.toBe("VOID");
      expect(stored!.paidAmount).toBe(100);
      expect(stored!.balance).toBe(stored!.grandTotal - 100);
    }
  });

  it("T38.5: invalid issue on ISSUED — domain rejection, no mutation", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const auditLogger = new MockAuditLogger();
    const notificationService = new CountingNotificationService();
    const issueService = buildIssueService(
      rentalInvoiceRepository,
      auditLogger,
      notificationService,
    );

    await expect(
      issueService.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("ISSUED");
    expect(auditLogger.entries).toHaveLength(0);
    expect(notificationService.enqueueCount).toBe(0);
  });

  it("T38.6: invalid void on PAID — domain rejection, no mutation", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildPaidRentalInvoiceEntity()]);
    const auditLogger = new MockAuditLogger();
    const voidService = buildVoidService(rentalInvoiceRepository, auditLogger);

    await expect(
      voidService.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("PAID");
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("T38.7: rollback after successful issue claim on audit failure", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);
    const auditLogger = new ThrowingAuditLogger();
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);

    const issueService = new IssueRentalInvoiceService(
      createRollbackTransactionRunner(
        rentalInvoiceRepository,
        new InMemoryRentalOrderRepository(),
        createCompletedRentalOrderLookup(),
        customerRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      issueService.execute({ id: RENTAL_INVOICE_ID }),
    ).rejects.toThrow("Audit failure");

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("DRAFT");
    expect(auditLogger.entries).toHaveLength(0);
  });
});
