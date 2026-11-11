import { describe, expect, it } from "vitest";

import { GetPaymentSummaryService } from "@/modules/payment/application/services/get-payment-summary.service";
import { Payment } from "@/modules/payment/domain/payment.entity";
import {
  computePaymentSummaryResult,
  filterPaymentsForSummary,
} from "@/modules/payment/domain/payment-summary.rules";
import {
  buildPaymentEntity,
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
} from "@/modules/payment/tests/helpers/payment.fixtures";
import {
  createSeededPaymentRepository,
  InMemoryPaymentRepository,
} from "@/modules/payment/tests/helpers/in-memory-payment.repository";
import type { PaymentId } from "@/shared/domain/ids";

function buildManyPendingPayments(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildPaymentEntity({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}` as PaymentId,
      status: "PENDING",
      amount: 100,
    }),
  );
}

describe("N-39-PATTERN-01 payment summary stats completeness", () => {
  it("returns correct summary for exactly 100 payments", async () => {
    const repository = createSeededPaymentRepository(buildManyPendingPayments(100));
    const service = new GetPaymentSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalPayments).toBe(100);
    expect(summary.statusCounts.all).toBe(100);
    expect(summary.statusCounts.PENDING).toBe(100);
    expect(summary.stats.totalPendingAmount).toBe(10_000);
  });

  it("returns correct summary for 101 payments (pagination boundary)", async () => {
    const repository = createSeededPaymentRepository(buildManyPendingPayments(101));
    const service = new GetPaymentSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalPayments).toBe(101);
    expect(summary.statusCounts.all).toBe(101);
    expect(summary.statusCounts.PENDING).toBe(101);
    expect(summary.stats.totalPendingAmount).toBe(10_100);
  });

  it("returns correct summary for 150 payments", async () => {
    const repository = createSeededPaymentRepository(buildManyPendingPayments(150));
    const service = new GetPaymentSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalPayments).toBe(150);
    expect(summary.statusCounts.PENDING).toBe(150);
  });

  it("counts each status, method, and amount category across the full dataset", async () => {
    const payments = [
      buildPaymentEntity({
        id: "00000000-0000-4000-8000-000000000020" as PaymentId,
        status: "PENDING",
        amount: 50,
        paymentMethod: "CASH",
      }),
      buildPaymentEntity({
        id: "00000000-0000-4000-8000-000000000021" as PaymentId,
        status: "POSTED",
        amount: 200,
        paymentMethod: "BANK_TRANSFER",
      }),
      buildPaymentEntity({
        id: "00000000-0000-4000-8000-000000000022" as PaymentId,
        status: "VOID",
        amount: 75,
        paymentMethod: "CARD",
      }),
      Payment.reconstitute({
        ...buildPaymentEntity({
          id: "00000000-0000-4000-8000-000000000023" as PaymentId,
          status: "POSTED",
          amount: 125,
          paymentMethod: "ONLINE",
        }).toProps(),
      }),
    ];
    const repository = createSeededPaymentRepository(payments);
    const service = new GetPaymentSummaryService(repository);

    const summary = await service.execute({});
    const expected = computePaymentSummaryResult(
      payments.map((payment) => ({
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
      })),
    );

    expect(summary).toEqual(expected);
    expect(summary.stats.activePayments).toBe(3);
    expect(summary.stats.totalCollected).toBe(325);
    expect(summary.stats.totalPendingAmount).toBe(50);
    expect(summary.methodCounts.CASH).toBe(1);
    expect(summary.methodCounts.BANK_TRANSFER).toBe(1);
  });

  it("applies the same customer filter as the payment listing", async () => {
    const matching = buildPaymentEntity({
      id: "00000000-0000-4000-8000-000000000001" as PaymentId,
      status: "PENDING",
    });
    const other = Payment.reconstitute({
      ...buildPaymentEntity({
        id: "00000000-0000-4000-8000-000000000002" as PaymentId,
        status: "PENDING",
      }).toProps(),
      customerId: OTHER_CUSTOMER_ID,
    });
    const repository = createSeededPaymentRepository([matching, other]);
    const service = new GetPaymentSummaryService(repository);

    const summary = await service.execute({ customerId: CUSTOMER_ID });

    expect(summary.stats.totalPayments).toBe(1);
    expect(summary.statusCounts.all).toBe(1);
  });

  it("applies search filters to summary counts", async () => {
    const alpha = Payment.reconstitute({
      ...buildPaymentEntity({
        id: "00000000-0000-4000-8000-000000000010" as PaymentId,
      }).toProps(),
      notes: "alpha batch",
    });
    const beta = Payment.reconstitute({
      ...buildPaymentEntity({
        id: "00000000-0000-4000-8000-000000000011" as PaymentId,
      }).toProps(),
      notes: "beta batch",
    });
    const repository = createSeededPaymentRepository([alpha, beta]);
    const service = new GetPaymentSummaryService(repository);

    const summary = await service.execute({ search: "alpha" });

    expect(summary.stats.totalPayments).toBe(1);
  });

  it("matches list filter semantics via shared summary query rules", () => {
    const repository = new InMemoryPaymentRepository();
    const payments = buildManyPendingPayments(120);
    repository.seed(payments);

    const filtered = filterPaymentsForSummary(payments, {
      status: "PENDING",
    });
    const expected = computePaymentSummaryResult(
      filtered.map((payment) => ({
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
      })),
    );

    expect(expected.stats.totalPayments).toBe(120);
  });
});
