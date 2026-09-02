import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { Payment } from "@/modules/payment/domain/payment.entity";
import { PostPaymentService } from "@/modules/payment/application/services/post-payment.service";
import { VoidPaymentService } from "@/modules/payment/application/services/void-payment.service";
import { IssueRentalInvoiceService } from "@/modules/rental-invoice/application/services/issue-rental-invoice.service";
import { VoidRentalInvoiceService } from "@/modules/rental-invoice/application/services/void-rental-invoice.service";
import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import {
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { resetPaymentCommitmentLockForTests } from "@/modules/payment/infrastructure/payment-commitment-lock";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type { PaymentId } from "@/shared/domain/ids";

import { InMemoryPaymentRepository } from "../tests/helpers/in-memory-payment.repository";
import {
  OTHER_PAYMENT_ID,
  PAYMENT_ID,
  USER_ID,
  buildCreatePaymentData,
  buildPostedPaymentEntity,
} from "../tests/helpers/payment.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";
import {
  RENTAL_INVOICE_ID,
  buildIssuedRentalInvoiceEntity,
  buildPartiallyPaidRentalInvoiceEntity,
  buildRentalInvoiceEntity,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import {
  createCompletedRentalOrderLookup,
} from "@/modules/rental-invoice/tests/helpers/in-memory-rental-order-invoice.lookup";
import {
  createPassThroughTransactionRunner as createInvoicePassThroughRunner,
  createRollbackTransactionRunner as createInvoiceRollbackRunner,
} from "@/modules/rental-invoice/tests/helpers/transaction-test-runner";

const FULL_PAYMENT_ID =
  "dd0e8400-e29b-41d4-a716-446655440002" as PaymentId;

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

function buildPaymentRunner(
  paymentRepository: InMemoryPaymentRepository,
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  auditLogger: MockAuditLogger,
  useRollback: boolean,
) {
  const scope = {
    paymentRepository,
    rentalInvoiceRepository,
    accountRepository: new InMemoryAccountRepository(),
    journalEntryRepository: new InMemoryJournalEntryRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  };

  return useRollback
    ? createRollbackTransactionRunner(
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        USER_ID,
      )
    : createPassThroughTransactionRunner(scope);
}

function buildInvoiceVoidRunner(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  paymentRepository: InMemoryPaymentRepository,
  auditLogger: MockAuditLogger,
  useRollback: boolean,
) {
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  const customerRepository = new InMemoryCustomerRepository();
  customerRepository.seed([buildCustomerEntity()]);

  const scope = {
    rentalInvoiceRepository,
    paymentRepository,
    rentalOrderRepository,
    rentalOrderInvoiceLookup: createCompletedRentalOrderLookup(),
    customerRepository,
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  };

  return useRollback
    ? createInvoiceRollbackRunner(
        rentalInvoiceRepository,
        rentalOrderRepository,
        createCompletedRentalOrderLookup(),
        customerRepository,
        auditLogger,
        USER_ID,
        paymentRepository,
      )
    : createInvoicePassThroughRunner(scope);
}

function assertInvoiceLifecycleCoherent(invoice: RentalInvoice): void {
  if (invoice.voidedAt !== null) {
    expect(invoice.status).toBe("VOID");
  }

  if (invoice.status === "VOID") {
    return;
  }

  const derived = invoice.withPaymentApplied(invoice.paidAmount);
  expect(invoice.status).toBe(derived.status);
}

describe("Phase 49 F-37-R1: derived invoice status atomicity", () => {
  beforeEach(() => {
    resetPaymentCommitmentLockForTests();
  });

  it("T49.1: normal payment on ISSUED invoice derives PARTIALLY_PAID", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPendingPayment(PAYMENT_ID, 100, "PAY-T49-1")]);

    const postService = new PostPaymentService(
      buildPaymentRunner(
        paymentRepository,
        rentalInvoiceRepository,
        new MockAuditLogger(),
        false,
      ),
    );

    await postService.execute({ id: PAYMENT_ID });

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("PARTIALLY_PAID");
    expect(stored?.paidAmount).toBe(100);
    assertInvoiceLifecycleCoherent(stored!);
  });

  it("T49.2: partial payment leaves invoice PARTIALLY_PAID with correct balance", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPendingPayment(PAYMENT_ID, 50, "PAY-T49-2")]);

    const postService = new PostPaymentService(
      buildPaymentRunner(
        paymentRepository,
        rentalInvoiceRepository,
        new MockAuditLogger(),
        false,
      ),
    );

    await postService.execute({ id: PAYMENT_ID });

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("PARTIALLY_PAID");
    expect(stored?.paidAmount).toBe(50);
    expect(stored?.balance).toBe(stored!.grandTotal - 50);
    assertInvoiceLifecycleCoherent(stored!);
  });

  it("T49.3: full payment derives PAID", async () => {
    const issued = buildIssuedRentalInvoiceEntity();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([issued]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(
        FULL_PAYMENT_ID,
        issued.grandTotal,
        "PAY-T49-3",
      ),
    ]);

    const postService = new PostPaymentService(
      buildPaymentRunner(
        paymentRepository,
        rentalInvoiceRepository,
        new MockAuditLogger(),
        false,
      ),
    );

    await postService.execute({ id: FULL_PAYMENT_ID });

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("PAID");
    expect(stored?.paidAmount).toBe(stored!.grandTotal);
    expect(stored?.balance).toBe(0);
    assertInvoiceLifecycleCoherent(stored!);
  });

  it("T49.4: void posted payment reverses money and derived status", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildPartiallyPaidRentalInvoiceEntity(100)]);

    const posted = buildPostedPaymentEntity({ amount: 100 });
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([posted]);

    const voidService = new VoidPaymentService(
      buildPaymentRunner(
        paymentRepository,
        rentalInvoiceRepository,
        new MockAuditLogger(),
        false,
      ),
    );

    await voidService.execute({ id: PAYMENT_ID });

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.paidAmount).toBe(0);
    expect(stored?.status).toBe("ISSUED");
    expect(stored?.balance).toBe(stored!.grandTotal);
    assertInvoiceLifecycleCoherent(stored!);
  });

  it("T49.5: concurrent POST payment ∥ VOID invoice — no stale status overwrite", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPendingPayment(PAYMENT_ID, 100, "PAY-T49-5")]);

    const auditLogger = new MockAuditLogger();
    const voidService = new VoidRentalInvoiceService(
      buildInvoiceVoidRunner(
        rentalInvoiceRepository,
        paymentRepository,
        auditLogger,
        false,
      ),
    );
    const postService = new PostPaymentService(
      buildPaymentRunner(
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        false,
      ),
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

    if (stored!.voidedAt !== null) {
      expect(stored!.status).toBe("VOID");
    }

    if (stored!.status === "VOID") {
      expect(stored!.paidAmount).toBe(0);
      expect(stored!.balance).toBe(stored!.grandTotal);
    } else {
      expect(stored!.status).not.toBe("VOID");
      expect(stored!.paidAmount).toBe(100);
      expect(stored!.balance).toBe(stored!.grandTotal - 100);
      expect(stored!.voidedAt).toBeNull();
    }

    assertInvoiceLifecycleCoherent(stored!);

    const postedCount =
      await paymentRepository.countPostedPaymentsByRentalInvoiceId(
        RENTAL_INVOICE_ID,
      );
    expect(stored!.status !== "VOID" || postedCount === 0).toBe(true);
  });

  it("T49.6: concurrent POST ∥ POST — additive settlement, consistent derived status", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(PAYMENT_ID, 100, "PAY-T49-6A"),
      buildPendingPayment(OTHER_PAYMENT_ID, 120, "PAY-T49-6B"),
    ]);

    const postService = new PostPaymentService(
      buildPaymentRunner(
        paymentRepository,
        rentalInvoiceRepository,
        new MockAuditLogger(),
        false,
      ),
    );

    const results = await Promise.allSettled([
      postService.execute({ id: PAYMENT_ID }),
      postService.execute({ id: OTHER_PAYMENT_ID }),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored).not.toBeNull();
    assertInvoiceLifecycleCoherent(stored!);
    expect(stored!.paidAmount).toBe(220);
    expect(stored!.status).toBe("PARTIALLY_PAID");
  });

  it("T49.7: conditional derived-status transition loses race after concurrent void", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

    const afterDelta = await rentalInvoiceRepository.applyPaymentDelta(
      RENTAL_INVOICE_ID,
      100,
    );
    expect(afterDelta?.status).toBe("ISSUED");
    expect(afterDelta?.paidAmount).toBe(100);

    await rentalInvoiceRepository.claimStatusTransition(
      RENTAL_INVOICE_ID,
      "ISSUED",
      { status: "VOID", voidedAt: new Date() },
    );

    const staleStatusClaim = await rentalInvoiceRepository.claimStatusTransition(
      RENTAL_INVOICE_ID,
      "ISSUED",
      { status: "PARTIALLY_PAID" },
    );
    expect(staleStatusClaim).toBeNull();

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("VOID");
    expect(stored?.voidedAt).not.toBeNull();
  });
});

describe("Phase 49 F-37-R1: issue path unchanged", () => {
  it("issue from DRAFT still derives ISSUED without payment side effects", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildRentalInvoiceEntity()]);

    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.seed([buildCustomerEntity()]);

    const issueService = new IssueRentalInvoiceService(
      createInvoicePassThroughRunner({
        rentalInvoiceRepository,
        paymentRepository: new InMemoryPaymentRepository(),
        rentalOrderRepository: new InMemoryRentalOrderRepository(),
        rentalOrderInvoiceLookup: createCompletedRentalOrderLookup(),
        customerRepository,
        auditLogger: new MockAuditLogger(),
        ...mockNotificationWriteScopeDeps,
        userId: USER_ID,
      }),
    );

    const result = await issueService.execute({ id: RENTAL_INVOICE_ID });
    expect(result.status).toBe("ISSUED");
    expect(result.paidAmount).toBe(0);
  });
});
