import { describe, expect, it } from "vitest";

import { Payment } from "@/modules/payment/domain/payment.entity";
import { PostPaymentService } from "@/modules/payment/application/services/post-payment.service";
import { VoidPaymentService } from "@/modules/payment/application/services/void-payment.service";
import {
  PAYMENT_ENTITY_NAME,
} from "@/modules/payment/application/services/payment-service.constants";
import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import {
  buildIssuedRentalInvoiceEntity,
  buildPartiallyPaidRentalInvoiceEntity,
  RENTAL_INVOICE_ID,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import { ConcurrentUpdateError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type { PaymentId } from "@/shared/domain/ids";

import { InMemoryPaymentRepository } from "../tests/helpers/in-memory-payment.repository";
import {
  OTHER_PAYMENT_ID,
  PAYMENT_ID,
  USER_ID,
  buildPaymentEntity,
  buildPostedPaymentEntity,
  buildCreatePaymentData,
} from "../tests/helpers/payment.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const THIRD_PAYMENT_ID =
  "dd0e8400-e29b-41d4-a716-446655440002" as PaymentId;

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
}

function buildPendingPayment(
  id: PaymentId,
  amount: number,
  paymentNumber: string,
): Payment {
  const created = Payment.create(
    buildCreatePaymentData({ paymentNumber, amount }),
  );
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Payment.reconstitute({
    id,
    ...created,
    createdAt: now,
    updatedAt: now,
  });
}

function buildPostPaymentService(
  paymentRepository: InMemoryPaymentRepository,
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
  transactionRunner = createPassThroughTransactionRunner({
    paymentRepository,
    rentalInvoiceRepository,
    accountRepository: new InMemoryAccountRepository(),
    journalEntryRepository: new InMemoryJournalEntryRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  }),
) {
  return new PostPaymentService(transactionRunner);
}

function buildVoidPaymentService(
  paymentRepository: InMemoryPaymentRepository,
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  return new VoidPaymentService(
    createPassThroughTransactionRunner({
      paymentRepository,
      rentalInvoiceRepository,
      accountRepository: new InMemoryAccountRepository(),
      journalEntryRepository: new InMemoryJournalEntryRepository(),
      auditLogger,
      ...mockNotificationWriteScopeDeps,
      userId: undefined,
    }),
  );
}

describe("Phase 35 F-35-01: payment invoice settlement concurrency", () => {
  it("T35.1: two concurrent posts against the same invoice both settle additively", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(PAYMENT_ID, 100, "PAY-2026-001"),
      buildPendingPayment(OTHER_PAYMENT_ID, 120, "PAY-2026-002"),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = buildPostPaymentService(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: PAYMENT_ID }),
      service.execute({ id: OTHER_PAYMENT_ID }),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(220);
    expect(invoice?.balance).toBe(130);
    expect(invoice?.status).toBe("PARTIALLY_PAID");

    const firstPayment = await paymentRepository.findById(PAYMENT_ID);
    const secondPayment = await paymentRepository.findById(OTHER_PAYMENT_ID);
    expect(firstPayment?.status).toBe("POSTED");
    expect(secondPayment?.status).toBe("POSTED");
  });

  it("T35.2: sequential single payment behavior remains correct", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPaymentEntity({ amount: 100 })]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = buildPostPaymentService(
      paymentRepository,
      rentalInvoiceRepository,
    );

    await service.execute({ id: PAYMENT_ID });

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(100);
    expect(invoice?.balance).toBe(250);
    expect(invoice?.status).toBe("PARTIALLY_PAID");
  });

  it("T35.3: three concurrent valid posts sum to final paidAmount and balance", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(PAYMENT_ID, 100, "PAY-2026-001"),
      buildPendingPayment(OTHER_PAYMENT_ID, 100, "PAY-2026-002"),
      buildPendingPayment(THIRD_PAYMENT_ID, 100, "PAY-2026-003"),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = buildPostPaymentService(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: PAYMENT_ID }),
      service.execute({ id: OTHER_PAYMENT_ID }),
      service.execute({ id: THIRD_PAYMENT_ID }),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(300);
    expect(invoice?.balance).toBe(50);
    expect(invoice!.grandTotal - invoice!.paidAmount).toBe(invoice!.balance);
  });

  it("T35.4: concurrent partial and full settlement ends with PAID and zero balance", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(PAYMENT_ID, 250, "PAY-2026-001"),
      buildPendingPayment(OTHER_PAYMENT_ID, 100, "PAY-2026-002"),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = buildPostPaymentService(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: PAYMENT_ID }),
      service.execute({ id: OTHER_PAYMENT_ID }),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(350);
    expect(invoice?.balance).toBe(0);
    expect(invoice?.status).toBe("PAID");
  });

  it("T35.5: rollback leaves payment and invoice unchanged after claim and delta", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPaymentEntity({ amount: 100 })]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const auditLogger = new ThrowingAuditLogger();
    const service = new PostPaymentService(
      createRollbackTransactionRunner(
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: PAYMENT_ID })).rejects.toThrow(
      "Audit failure",
    );

    const payment = await paymentRepository.findById(PAYMENT_ID);
    expect(payment?.status).toBe("PENDING");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(0);
    expect(invoice?.balance).toBe(350);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("T35.6: duplicate concurrent post of the same payment applies delta once", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPaymentEntity({ amount: 100 })]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const service = buildPostPaymentService(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: PAYMENT_ID }),
      service.execute({ id: PAYMENT_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      entity: PAYMENT_ENTITY_NAME,
      action: "post",
    });

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(100);
    expect(invoice?.balance).toBe(250);

    const payment = await paymentRepository.findById(PAYMENT_ID);
    expect(payment?.status).toBe("POSTED");
  });

  it("void regression: posted payment void reverses invoice totals and status", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    const posted = buildPostedPaymentEntity();
    paymentRepository.seed([posted]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([
      buildPartiallyPaidRentalInvoiceEntity(posted.amount),
    ]);
    const service = buildVoidPaymentService(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const result = await service.execute({ id: PAYMENT_ID });

    expect(result.status).toBe("VOID");

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(0);
    expect(invoice?.balance).toBe(350);
    expect(invoice?.status).toBe("ISSUED");
  });

  it("void regression: duplicate concurrent void of the same posted payment succeeds once", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    const posted = buildPostedPaymentEntity();
    paymentRepository.seed([posted]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([
      buildPartiallyPaidRentalInvoiceEntity(posted.amount),
    ]);
    const service = buildVoidPaymentService(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: PAYMENT_ID }),
      service.execute({ id: PAYMENT_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(invoice?.paidAmount).toBe(0);
    expect(invoice?.balance).toBe(350);
  });
});
