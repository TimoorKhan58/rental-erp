import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockSession } from "@/shared/infrastructure/auth/api-auth.test-helpers";

vi.mock("@/lib/auth", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibAuthMockModule(),
);

vi.mock("@/lib/prisma", async () =>
  (await import("@/shared/infrastructure/auth/api-auth.test-helpers")).createLibPrismaMockModule(),
);

import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { buildCustomerEntity } from "@/modules/customer/tests/helpers/customer.fixtures";
import { Payment } from "@/modules/payment/domain/payment.entity";
import { PostPaymentService } from "@/modules/payment/application/services/post-payment.service";
import { InMemoryPaymentRepository } from "@/modules/payment/tests/helpers/in-memory-payment.repository";
import {
  OTHER_PAYMENT_ID,
  PAYMENT_ID,
  USER_ID,
  buildCreatePaymentData,
  buildPostedPaymentEntity,
  buildVoidPaymentEntity,
} from "@/modules/payment/tests/helpers/payment.fixtures";
import {
  createPassThroughTransactionRunner as createPaymentPassThroughRunner,
} from "@/modules/payment/tests/helpers/transaction-test-runner";
import { VoidRentalInvoiceService } from "@/modules/rental-invoice/application/services/void-rental-invoice.service";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import {
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { resetPaymentCommitmentLockForTests } from "@/modules/payment/infrastructure/payment-commitment-lock";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type { PaymentId } from "@/shared/domain/ids";

import {
  RENTAL_INVOICE_ID,
  buildIssuedRentalInvoiceEntity,
  buildPaidRentalInvoiceEntity,
  buildPartiallyPaidRentalInvoiceEntity,
  buildVoidRentalInvoiceEntity,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import {
  createCompletedRentalOrderLookup,
} from "@/modules/rental-invoice/tests/helpers/in-memory-rental-order-invoice.lookup";
import { MockAuditLogger } from "@/modules/rental-invoice/tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner as createInvoicePassThroughRunner,
} from "@/modules/rental-invoice/tests/helpers/transaction-test-runner";
import { runRentalInvoiceApiRoute } from "@/modules/rental-invoice/presentation/http/rental-invoice-api.route-runner";
import { createMockNextRequest } from "@/modules/dispatch/tests/helpers/api-request.factory";

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

function buildInvoiceVoidHarness(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  paymentRepository: InMemoryPaymentRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  const customerRepository = new InMemoryCustomerRepository();
  customerRepository.seed([buildCustomerEntity()]);

  const transactionRunner = createInvoicePassThroughRunner({
    rentalInvoiceRepository,
    paymentRepository,
    rentalOrderRepository: new InMemoryRentalOrderRepository(),
    rentalOrderInvoiceLookup: createCompletedRentalOrderLookup(),
    customerRepository,
    accountRepository: new InMemoryAccountRepository(),
    journalEntryRepository: new InMemoryJournalEntryRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });

  return {
    voidService: new VoidRentalInvoiceService(transactionRunner),
    postService: new PostPaymentService(
      createPaymentPassThroughRunner({
        paymentRepository,
        rentalInvoiceRepository,
        accountRepository: new InMemoryAccountRepository(),
        journalEntryRepository: new InMemoryJournalEntryRepository(),
        auditLogger,
        ...mockNotificationWriteScopeDeps,
        userId: USER_ID,
      }),
    ),
    auditLogger,
  };
}

async function assertNoVoidWithPostedPayments(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  paymentRepository: InMemoryPaymentRepository,
): Promise<void> {
  const invoice = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
  const postedCount =
    await paymentRepository.countPostedPaymentsByRentalInvoiceId(
      RENTAL_INVOICE_ID,
    );

  expect(invoice).not.toBeNull();
  expect(invoice!.status !== "VOID" || postedCount === 0).toBe(true);
}

describe("Phase 52 — N-44-05 block invoice void when POSTED payments exist", () => {
  beforeEach(() => {
    resetPaymentCommitmentLockForTests();
  });

  it("T52.1 allows void when no POSTED payments exist", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);
    const paymentRepository = new InMemoryPaymentRepository();

    const { voidService } = buildInvoiceVoidHarness(
      rentalInvoiceRepository,
      paymentRepository,
    );

    const result = await voidService.execute({ id: RENTAL_INVOICE_ID });

    expect(result.status).toBe("VOID");
    expect(result.voidedAt).not.toBeNull();
    expect(await paymentRepository.countPostedPaymentsByRentalInvoiceId(
      RENTAL_INVOICE_ID,
    )).toBe(0);
  });

  it("T52.2 rejects void for PARTIALLY_PAID invoice with POSTED payment", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildPartiallyPaidRentalInvoiceEntity(100)]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPostedPaymentEntity()]);

    const { voidService, auditLogger } = buildInvoiceVoidHarness(
      rentalInvoiceRepository,
      paymentRepository,
    );

    await expect(voidService.execute({ id: RENTAL_INVOICE_ID })).rejects.toMatchObject({
      message:
        "Cannot void rental invoice while POSTED payments exist. Void the payments first.",
    });

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("PARTIALLY_PAID");
    expect(stored?.paidAmount).toBe(100);
    expect((await paymentRepository.findById(PAYMENT_ID))?.status).toBe("POSTED");
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("T52.3 rejects void for PAID invoice with POSTED payment via domain lifecycle", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildPaidRentalInvoiceEntity()]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPostedPaymentEntity()]);

    const { voidService } = buildInvoiceVoidHarness(
      rentalInvoiceRepository,
      paymentRepository,
    );

    await expect(voidService.execute({ id: RENTAL_INVOICE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const stored = await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID);
    expect(stored?.status).toBe("PAID");
    expect(await paymentRepository.countPostedPaymentsByRentalInvoiceId(
      RENTAL_INVOICE_ID,
    )).toBe(1);
  });

  it("T52.4 allows void when only non-POSTED payments exist", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(PAYMENT_ID, 100, "PAY-PENDING"),
      buildVoidPaymentEntity(true),
    ]);

    const { voidService } = buildInvoiceVoidHarness(
      rentalInvoiceRepository,
      paymentRepository,
    );

    const result = await voidService.execute({ id: RENTAL_INVOICE_ID });

    expect(result.status).toBe("VOID");
    expect(await paymentRepository.countPostedPaymentsByRentalInvoiceId(
      RENTAL_INVOICE_ID,
    )).toBe(0);
  });

  it("T52.5 rejects void when multiple POSTED payments exist", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildPartiallyPaidRentalInvoiceEntity(220)]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPostedPaymentEntity(),
      Payment.reconstitute({
        ...buildPostedPaymentEntity().toProps(),
        id: OTHER_PAYMENT_ID,
        paymentNumber: "PAY-2026-002",
        amount: 120,
      }),
    ]);

    const { voidService } = buildInvoiceVoidHarness(
      rentalInvoiceRepository,
      paymentRepository,
    );

    await expect(voidService.execute({ id: RENTAL_INVOICE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    expect(await paymentRepository.countPostedPaymentsByRentalInvoiceId(
      RENTAL_INVOICE_ID,
    )).toBe(2);
    expect((await rentalInvoiceRepository.findById(RENTAL_INVOICE_ID))?.status).toBe(
      "PARTIALLY_PAID",
    );
  });

  it("T52.6 preserves existing invoice lifecycle restrictions", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildVoidRentalInvoiceEntity()]);
    const paymentRepository = new InMemoryPaymentRepository();

    const { voidService } = buildInvoiceVoidHarness(
      rentalInvoiceRepository,
      paymentRepository,
    );

    await expect(voidService.execute({ id: RENTAL_INVOICE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("T52.7 keeps unauthorized callers unauthorized at API boundary", async () => {
    mockSession(USER_ROLES.VIEWER);

    const result = await runRentalInvoiceApiRoute({
      request: createMockNextRequest({ method: "POST" }),
      route: `/api/rental-invoices/${RENTAL_INVOICE_ID}/void`,
      httpMethod: "POST",
      permission: PERMISSIONS.rentalInvoices.void,
      resolveServices: () =>
        ({
          voidRentalInvoice: { execute: vi.fn() },
        }) as never,
      handler: async () => ({ ok: true }),
    });

    expect(result.status).toBe(403);
  });

  it("T52.8 concurrent POST payment ∥ VOID invoice preserves invariant", async () => {
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedRentalInvoiceEntity()]);

    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([buildPendingPayment(PAYMENT_ID, 100, "PAY-T52-8")]);

    const { voidService, postService } = buildInvoiceVoidHarness(
      rentalInvoiceRepository,
      paymentRepository,
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

    await assertNoVoidWithPostedPayments(
      rentalInvoiceRepository,
      paymentRepository,
    );
  });
});
