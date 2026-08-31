import { beforeEach, describe, expect, it } from "vitest";

import { CreateSupplierPaymentService } from "@/modules/supplier-payment/application/services/create-supplier-payment.service";
import { resetSupplierPaymentCommitmentLockForTests } from "@/modules/supplier-payment/infrastructure/supplier-payment-commitment-lock";
import { InMemoryPurchaseOrderRepository } from "@/modules/procurement/tests/helpers/in-memory-purchase-order.repository";
import {
  buildPurchaseOrderEntity,
  ITEM_ID,
  PRODUCT_ID,
  PURCHASE_ORDER_ID,
} from "@/modules/procurement/tests/helpers/purchase-order.fixtures";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import type { CreateSupplierPaymentInput } from "@/modules/supplier-payment/application/schemas/supplier-payment.schemas";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import { InMemorySupplierPaymentRepository } from "../tests/helpers/in-memory-supplier-payment.repository";
import {
  SUPPLIER_PAYMENT_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildSupplierPaymentEntity,
} from "../tests/helpers/supplier-payment.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

const BASE_CREATE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateSupplierPaymentInput;

function buildApprovedPurchaseOrderWithBalance(balance: number) {
  return buildPurchaseOrderEntity({
    status: "APPROVED",
    items: [
      {
        id: ITEM_ID,
        productId: PRODUCT_ID,
        quantity: 1,
        unitCost: balance,
        receivedQuantity: 0,
      },
    ],
  });
}

function createCreateSupplierPaymentService(
  supplierPaymentRepository: InMemorySupplierPaymentRepository,
  purchaseOrderRepository: InMemoryPurchaseOrderRepository,
) {
  const transactionRunner = createPassThroughTransactionRunner({
    supplierPaymentRepository,
    purchaseOrderRepository,
    auditLogger: new MockAuditLogger(),
    userId: USER_ID,
  });

  return new CreateSupplierPaymentService(
    transactionRunner,
    createMockNumberSequenceRepository(),
  );
}

async function sumPending(
  supplierPaymentRepository: InMemorySupplierPaymentRepository,
  purchaseOrderId = PURCHASE_ORDER_ID,
): Promise<number> {
  return supplierPaymentRepository.sumPendingAmountByPurchaseOrderId(
    purchaseOrderId,
  );
}

describe("Phase 46 N-44-06: supplier pending payment over-commitment integrity", () => {
  beforeEach(() => {
    resetSupplierPaymentCommitmentLockForTests();
  });

  it("T46.1: concurrent creates exactly fit PO balance capacity", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderWithBalance(500)]);
    const createSupplierPayment = createCreateSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    const results = await Promise.allSettled([
      createSupplierPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "SPAY-T46-1-A",
        amount: 300,
      }),
      createSupplierPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "SPAY-T46-1-B",
        amount: 200,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(0);
    expect(await sumPending(supplierPaymentRepository)).toBe(500);
  });

  it("T46.2: concurrent creates exceeding PO balance allow one success and reject the other", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderWithBalance(500)]);
    const createSupplierPayment = createCreateSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    const results = await Promise.allSettled([
      createSupplierPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "SPAY-T46-2-A",
        amount: 300,
      }),
      createSupplierPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "SPAY-T46-2-B",
        amount: 300,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      rejected[0]?.status === "rejected" &&
        rejected[0].reason instanceof UnprocessableError,
    ).toBe(true);
    expect(await sumPending(supplierPaymentRepository)).toBe(300);
  });

  it("T46.3: rejects concurrent create when existing pending commitments leave no room", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([
      buildSupplierPaymentEntity({
        id: SUPPLIER_PAYMENT_ID,
        amount: 300,
        status: "PENDING",
      }),
    ]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderWithBalance(500)]);
    const createSupplierPayment = createCreateSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    await expect(
      createSupplierPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "SPAY-T46-3",
        amount: 300,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(await sumPending(supplierPaymentRepository)).toBe(300);
    expect(supplierPaymentRepository.count()).toBe(1);
  });

  it("T46.4: accepts create when pending plus amount equals PO balance exactly", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([
      buildSupplierPaymentEntity({
        id: SUPPLIER_PAYMENT_ID,
        amount: 300,
        status: "PENDING",
      }),
    ]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderWithBalance(500)]);
    const createSupplierPayment = createCreateSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    await createSupplierPayment.execute({
      ...BASE_CREATE_INPUT,
      paymentNumber: "SPAY-T46-4",
      amount: 200,
    });

    expect(await sumPending(supplierPaymentRepository)).toBe(500);
  });

  it("T46.5: rejects create one unit over available PO balance", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([
      buildSupplierPaymentEntity({
        id: SUPPLIER_PAYMENT_ID,
        amount: 499,
        status: "PENDING",
      }),
    ]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderWithBalance(500)]);
    const createSupplierPayment = createCreateSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    await expect(
      createSupplierPayment.execute({
        ...BASE_CREATE_INPUT,
        paymentNumber: "SPAY-T46-5",
        amount: 2,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(await sumPending(supplierPaymentRepository)).toBe(499);
    expect(supplierPaymentRepository.count()).toBe(1);
  });

  it("does not count non-PENDING supplier payments toward pending commitment", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([
      buildSupplierPaymentEntity({
        id: SUPPLIER_PAYMENT_ID,
        amount: 300,
        status: "POSTED",
      }),
    ]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderWithBalance(500)]);
    const createSupplierPayment = createCreateSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    await createSupplierPayment.execute({
      ...BASE_CREATE_INPUT,
      paymentNumber: "SPAY-NON-PENDING",
      amount: 500,
    });

    expect(await sumPending(supplierPaymentRepository)).toBe(500);
  });
});
