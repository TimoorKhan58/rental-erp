import { beforeEach, describe, expect, it } from "vitest";

import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import { CreatePaymentService } from "@/modules/payment/application/services/create-payment.service";
import { UpdatePaymentService } from "@/modules/payment/application/services/update-payment.service";
import { resetPaymentCommitmentLockForTests } from "@/modules/payment/infrastructure/payment-commitment-lock";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import {
  buildIssuedRentalInvoiceEntity,
  RENTAL_INVOICE_ID,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import type { CreatePaymentInput } from "@/modules/payment/application/schemas/payment.schemas";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import type { PaymentId } from "@/shared/domain/ids";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import { InMemoryPaymentRepository } from "../tests/helpers/in-memory-payment.repository";
import { Payment } from "@/modules/payment/domain/payment.entity";
import {
  OTHER_PAYMENT_ID,
  PAYMENT_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildCreatePaymentData,
  buildPaymentEntity,
} from "../tests/helpers/payment.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

const THIRD_PAYMENT_ID =
  "dd0e8400-e29b-41d4-a716-446655440002" as PaymentId;

const BASE_CREATE_INPUT =
  VALID_CREATE_INPUT as unknown as CreatePaymentInput;

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

function buildIssuedInvoiceWithBalance(balance: number): RentalInvoice {
  const issued = buildIssuedRentalInvoiceEntity();

  return RentalInvoice.reconstitute({
    ...issued.toProps(),
    grandTotal: balance,
    paidAmount: 0,
    balance,
  });
}

function createServices(
  paymentRepository: InMemoryPaymentRepository,
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
) {
  const transactionRunner = createPassThroughTransactionRunner({
    paymentRepository,
    rentalInvoiceRepository,
    auditLogger: new MockAuditLogger(),
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });

  return {
    createPayment: new CreatePaymentService(
      transactionRunner,
      createMockNumberSequenceRepository(),
    ),
    updatePayment: new UpdatePaymentService(transactionRunner),
  };
}

async function sumPending(
  paymentRepository: InMemoryPaymentRepository,
  invoiceId = RENTAL_INVOICE_ID,
): Promise<number> {
  return paymentRepository.sumPendingAmountByRentalInvoiceId(invoiceId);
}

describe("Phase 39 F-36-03: pending payment over-commitment integrity", () => {
  beforeEach(() => {
    resetPaymentCommitmentLockForTests();
  });

  it("T39.1: concurrent create with exact remaining balance never over-commits", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(400)]);
    const { createPayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      createPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "PAY-T39-1-A",
        amount: 250,
      }),
      createPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "PAY-T39-1-B",
        amount: 150,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled.length + rejected.length).toBe(2);
    expect(await sumPending(paymentRepository)).toBeLessThanOrEqual(400);

    if (fulfilled.length === 2) {
      expect(await sumPending(paymentRepository)).toBe(400);
    }
  });

  it("T39.2: concurrent create over-commit allows one success and rejects the other", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(350)]);
    const { createPayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      createPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "PAY-T39-2-A",
        amount: 200,
      }),
      createPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "PAY-T39-2-B",
        amount: 200,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.status === "rejected" &&
      rejected[0].reason instanceof UnprocessableError).toBe(true);
    expect(await sumPending(paymentRepository)).toBe(200);
  });

  it("T39.3: rejects create when existing pending commitments leave no room", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity({
        id: PAYMENT_ID,
        amount: 300,
        status: "PENDING",
      }),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(500)]);
    const { createPayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    await expect(
      createPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "PAY-T39-3",
        amount: 250,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(await sumPending(paymentRepository)).toBe(300);
    expect(paymentRepository.count()).toBe(1);
  });

  it("T39.4: concurrent pending updates never over-commit aggregate", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(PAYMENT_ID, 200, "PAY-T39-4-A"),
      buildPendingPayment(OTHER_PAYMENT_ID, 200, "PAY-T39-4-B"),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(500)]);
    const { updatePayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    const results = await Promise.allSettled([
      updatePayment.execute({ id: PAYMENT_ID }, { amount: 350 }),
      updatePayment.execute({ id: OTHER_PAYMENT_ID }, { amount: 350 }),
    ]);

    expect(results.some((result) => result.status === "rejected")).toBe(true);
    expect(await sumPending(paymentRepository)).toBeLessThanOrEqual(500);
    expect(await sumPending(paymentRepository)).toBeGreaterThan(200);
  });

  it("T39.5: update excludes self from pending sum and succeeds when within balance", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPendingPayment(PAYMENT_ID, 100, "PAY-T39-5-A"),
      buildPendingPayment(OTHER_PAYMENT_ID, 100, "PAY-T39-5-B"),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(500)]);
    const { updatePayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    await updatePayment.execute({ id: PAYMENT_ID }, { amount: 250 });

    expect(await sumPending(paymentRepository)).toBe(350);
  });

  it("returns zero pending sum when no pending payments exist", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity({
        id: PAYMENT_ID,
        amount: 100,
        status: "POSTED",
      }),
    ]);

    expect(await sumPending(paymentRepository)).toBe(0);
  });

  it("accepts create when pending plus amount equals invoice balance exactly", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity({
        id: PAYMENT_ID,
        amount: 150,
        status: "PENDING",
      }),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(350)]);
    const { createPayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    await createPayment.execute({
      ...BASE_CREATE_INPUT,
      paymentNumber: "PAY-EXACT",
      amount: 200,
    });

    expect(await sumPending(paymentRepository)).toBe(350);
  });

  it("rejects create one unit over available balance", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity({
        id: PAYMENT_ID,
        amount: 200,
        status: "PENDING",
      }),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(350)]);
    const { createPayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    await expect(
      createPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "PAY-OVER",
        amount: 151,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("allows update to same amount and downward amount", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity({
        id: PAYMENT_ID,
        amount: 200,
        status: "PENDING",
      }),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(350)]);
    const { updatePayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    await updatePayment.execute({ id: PAYMENT_ID }, { amount: 200 });
    await updatePayment.execute({ id: PAYMENT_ID }, { amount: 150 });

    expect(await sumPending(paymentRepository)).toBe(150);
  });

  it("does not count non-PENDING payments toward pending commitment", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    paymentRepository.seed([
      buildPaymentEntity({
        id: PAYMENT_ID,
        amount: 300,
        status: "POSTED",
      }),
      buildPaymentEntity({
        id: OTHER_PAYMENT_ID,
        amount: 50,
        status: "VOID",
      }),
      buildPendingPayment(THIRD_PAYMENT_ID, 100, "PAY-PENDING"),
    ]);
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    rentalInvoiceRepository.seed([buildIssuedInvoiceWithBalance(350)]);
    const { createPayment } = createServices(
      paymentRepository,
      rentalInvoiceRepository,
    );

    await createPayment.execute({
      ...BASE_CREATE_INPUT,
      paymentNumber: "PAY-NEW",
      amount: 250,
    });

    expect(await sumPending(paymentRepository)).toBe(350);
  });
});
