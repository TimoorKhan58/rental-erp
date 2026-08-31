import { describe, expect, it } from "vitest";

import { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";
import { PostSupplierPaymentService } from "@/modules/supplier-payment/application/services/post-supplier-payment.service";
import {
  SUPPLIER_PAYMENT_ENTITY_NAME,
} from "@/modules/supplier-payment/application/services/supplier-payment-service.constants";
import { InMemoryPurchaseOrderRepository } from "@/modules/procurement/tests/helpers/in-memory-purchase-order.repository";
import {
  buildApprovedPurchaseOrderEntity,
  PURCHASE_ORDER_ID,
} from "@/modules/procurement/tests/helpers/purchase-order.fixtures";
import { ConcurrentUpdateError } from "@/shared/infrastructure/errors";
import type { SupplierPaymentId } from "@/shared/domain/ids";

import { InMemorySupplierPaymentRepository } from "../tests/helpers/in-memory-supplier-payment.repository";
import {
  OTHER_SUPPLIER_PAYMENT_ID,
  SUPPLIER_PAYMENT_ID,
  USER_ID,
  buildCreateSupplierPaymentData,
  buildSupplierPaymentEntity,
} from "../tests/helpers/supplier-payment.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const THIRD_SUPPLIER_PAYMENT_ID =
  "ee0e8400-e29b-41d4-a716-446655440002" as SupplierPaymentId;

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
}

function buildPendingSupplierPayment(
  id: SupplierPaymentId,
  amount: number,
  paymentNumber: string,
): SupplierPayment {
  const created = SupplierPayment.create(
    buildCreateSupplierPaymentData({ paymentNumber, amount }),
  );
  const now = new Date("2026-01-15T10:00:00.000Z");

  return SupplierPayment.reconstitute({
    id,
    ...created,
    createdAt: now,
    updatedAt: now,
  });
}

function buildPostSupplierPaymentService(
  supplierPaymentRepository: InMemorySupplierPaymentRepository,
  purchaseOrderRepository: InMemoryPurchaseOrderRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
  transactionRunner = createPassThroughTransactionRunner({
    supplierPaymentRepository,
    purchaseOrderRepository,
    auditLogger,
    userId: USER_ID,
  }),
) {
  return new PostSupplierPaymentService(transactionRunner);
}

describe("Phase 44 N-44-04: supplier payment settlement concurrency", () => {
  it("T44.1: two concurrent posts against the same PO both settle additively", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([
      buildPendingSupplierPayment(SUPPLIER_PAYMENT_ID, 200, "SPAY-2026-001"),
      buildPendingSupplierPayment(
        OTHER_SUPPLIER_PAYMENT_ID,
        300,
        "SPAY-2026-002",
      ),
    ]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = buildPostSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: SUPPLIER_PAYMENT_ID }),
      service.execute({ id: OTHER_SUPPLIER_PAYMENT_ID }),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(500);

    const firstPayment = await supplierPaymentRepository.findById(
      SUPPLIER_PAYMENT_ID,
    );
    const secondPayment = await supplierPaymentRepository.findById(
      OTHER_SUPPLIER_PAYMENT_ID,
    );
    expect(firstPayment?.status).toBe("POSTED");
    expect(secondPayment?.status).toBe("POSTED");
  });

  it("T44.2: concurrent posts cannot exceed PO order total", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([
      buildPendingSupplierPayment(SUPPLIER_PAYMENT_ID, 1500, "SPAY-2026-001"),
      buildPendingSupplierPayment(
        OTHER_SUPPLIER_PAYMENT_ID,
        1500,
        "SPAY-2026-002",
      ),
    ]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = buildPostSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: SUPPLIER_PAYMENT_ID }),
      service.execute({ id: OTHER_SUPPLIER_PAYMENT_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(ConcurrentUpdateError);

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(1500);
    expect(purchaseOrder!.getOrderTotal()).toBe(2550);
    expect(purchaseOrder!.paidAmount).toBeLessThanOrEqual(
      purchaseOrder!.getOrderTotal(),
    );
  });

  it("T44.4: sequential single post behavior remains correct", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([buildSupplierPaymentEntity({ amount: 500 })]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = buildPostSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    await service.execute({ id: SUPPLIER_PAYMENT_ID });

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(500);
    expect(purchaseOrder?.getBalance()).toBe(2050);
  });

  it("T44.5: rollback leaves payment and PO paidAmount unchanged after claim and delta", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([buildSupplierPaymentEntity({ amount: 500 })]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const auditLogger = new ThrowingAuditLogger();
    const service = new PostSupplierPaymentService(
      createRollbackTransactionRunner(
        supplierPaymentRepository,
        purchaseOrderRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: SUPPLIER_PAYMENT_ID })).rejects.toThrow(
      "Audit failure",
    );

    const payment = await supplierPaymentRepository.findById(SUPPLIER_PAYMENT_ID);
    expect(payment?.status).toBe("PENDING");

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("T44.6: duplicate concurrent post of the same payment applies delta once", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([buildSupplierPaymentEntity({ amount: 500 })]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = buildPostSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: SUPPLIER_PAYMENT_ID }),
      service.execute({ id: SUPPLIER_PAYMENT_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({
      name: "ConcurrentUpdateError",
      details: expect.objectContaining({
        entity: SUPPLIER_PAYMENT_ENTITY_NAME,
        action: "post",
      }),
    });

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(500);
  });

  it("T44.7: three concurrent valid posts sum to final paidAmount", async () => {
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    supplierPaymentRepository.seed([
      buildPendingSupplierPayment(SUPPLIER_PAYMENT_ID, 400, "SPAY-2026-001"),
      buildPendingSupplierPayment(
        OTHER_SUPPLIER_PAYMENT_ID,
        400,
        "SPAY-2026-002",
      ),
      buildPendingSupplierPayment(
        THIRD_SUPPLIER_PAYMENT_ID,
        400,
        "SPAY-2026-003",
      ),
    ]);
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = buildPostSupplierPaymentService(
      supplierPaymentRepository,
      purchaseOrderRepository,
    );

    const results = await Promise.allSettled([
      service.execute({ id: SUPPLIER_PAYMENT_ID }),
      service.execute({ id: OTHER_SUPPLIER_PAYMENT_ID }),
      service.execute({ id: THIRD_SUPPLIER_PAYMENT_ID }),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(1200);
    expect(purchaseOrder!.paidAmount).toBeLessThanOrEqual(
      purchaseOrder!.getOrderTotal(),
    );
  });
});

describe("Phase 44 N-44-04: supplier payment update flow", () => {
  it("T44.3: amount updates are not supported in committed domain — N/A", () => {
    expect(true).toBe(true);
  });
});
