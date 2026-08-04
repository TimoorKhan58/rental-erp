import { describe, expect, it, vi } from "vitest";

import { CreateSupplierPaymentService } from "@/modules/supplier-payment/application/services/create-supplier-payment.service";
import { GetSupplierPaymentByIdService } from "@/modules/supplier-payment/application/services/get-supplier-payment-by-id.service";
import { ListSupplierPaymentsService } from "@/modules/supplier-payment/application/services/list-supplier-payments.service";
import { PostSupplierPaymentService } from "@/modules/supplier-payment/application/services/post-supplier-payment.service";
import {
  SUPPLIER_PAYMENT_ENTITY_NAME,
  SUPPLIER_PAYMENT_MODULE,
} from "@/modules/supplier-payment/application/services/supplier-payment-service.constants";
import { VoidSupplierPaymentService } from "@/modules/supplier-payment/application/services/void-supplier-payment.service";
import type { CreateSupplierPaymentInput } from "@/modules/supplier-payment/application/schemas/supplier-payment.schemas";
import { InMemoryPurchaseOrderRepository } from "@/modules/procurement/tests/helpers/in-memory-purchase-order.repository";
import {
  buildApprovedPurchaseOrderEntity,
  buildPurchaseOrderEntity,
  PURCHASE_ORDER_ID,
} from "@/modules/procurement/tests/helpers/purchase-order.fixtures";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import { InMemorySupplierPaymentRepository } from "../tests/helpers/in-memory-supplier-payment.repository";
import {
  OTHER_SUPPLIER_ID,
  SUPPLIER_PAYMENT_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildPostedSupplierPaymentEntity,
  buildSupplierPaymentEntity,
} from "../tests/helpers/supplier-payment.fixtures";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  supplierPaymentRepository: InMemorySupplierPaymentRepository,
  purchaseOrderRepository: InMemoryPurchaseOrderRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    supplierPaymentRepository,
    purchaseOrderRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateSupplierPaymentInput;

function createDefaultTestScope(
  auditLogger: MockAuditLogger = new MockAuditLogger(),
  userId: string | undefined = USER_ID,
) {
  const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
  const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
  purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);

  return {
    supplierPaymentRepository,
    purchaseOrderRepository,
    auditLogger,
    transactionRunner: createWriteScope(
      supplierPaymentRepository,
      purchaseOrderRepository,
      auditLogger,
      userId,
    ),
  };
}

describe("CreateSupplierPaymentService", () => {
  it("creates a pending supplier payment", async () => {
    const { transactionRunner, supplierPaymentRepository } =
      createDefaultTestScope();
    const service = new CreateSupplierPaymentService(transactionRunner, {
      generateNextNumber: vi.fn(),
    } as any);

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.paymentNumber).toBe("SPAY-2026-001");
    expect(result.status).toBe("PENDING");
    expect(result.amount).toBe(500);
    expect(supplierPaymentRepository.count()).toBe(1);
  });

  it("rejects draft purchase order", async () => {
    const { transactionRunner, purchaseOrderRepository } =
      createDefaultTestScope();
    purchaseOrderRepository.seed([buildPurchaseOrderEntity()]);
    const service = new CreateSupplierPaymentService(transactionRunner, {
      generateNextNumber: vi.fn(),
    } as any);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects wrong supplier", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateSupplierPaymentService(transactionRunner, {
      generateNextNumber: vi.fn(),
    } as any);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        supplierId: OTHER_SUPPLIER_ID,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects amount exceeding purchase order balance", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateSupplierPaymentService(transactionRunner, {
      generateNextNumber: vi.fn(),
    } as any);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        amount: 99999,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects duplicate payment number", async () => {
    const { transactionRunner, supplierPaymentRepository } =
      createDefaultTestScope();
    supplierPaymentRepository.seed([buildSupplierPaymentEntity()]);
    const service = new CreateSupplierPaymentService(transactionRunner, {
      generateNextNumber: vi.fn(),
    } as any);

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid amount", async () => {
    const { transactionRunner } = createDefaultTestScope();
    const service = new CreateSupplierPaymentService(transactionRunner, {
      generateNextNumber: vi.fn(),
    } as any);

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        amount: 0,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects missing user context", async () => {
    const auditLogger = new MockAuditLogger();
    const supplierPaymentRepository = new InMemorySupplierPaymentRepository();
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = new CreateSupplierPaymentService(
      createWriteScope(
        supplierPaymentRepository,
        purchaseOrderRepository,
        auditLogger,
        undefined,
      ),
      { generateNextNumber: vi.fn() } as any,
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const { transactionRunner } = createDefaultTestScope(auditLogger);
    const service = new CreateSupplierPaymentService(transactionRunner, {
      generateNextNumber: vi.fn(),
    } as any);

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: SUPPLIER_PAYMENT_MODULE,
      entityName: SUPPLIER_PAYMENT_ENTITY_NAME,
      action: "CREATE",
    });
  });
});

describe("PostSupplierPaymentService", () => {
  it("posts pending payment and increases purchase order paidAmount", async () => {
    const {
      transactionRunner,
      supplierPaymentRepository,
      purchaseOrderRepository,
    } = createDefaultTestScope();
    supplierPaymentRepository.seed([buildSupplierPaymentEntity()]);
    const service = new PostSupplierPaymentService(transactionRunner);

    const result = await service.execute({ id: SUPPLIER_PAYMENT_ID });

    expect(result.status).toBe("POSTED");
    expect(result.postedAt).not.toBeNull();

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(500);
    expect(purchaseOrder?.status).toBe("APPROVED");
  });

  it("rejects post when not pending", async () => {
    const { transactionRunner, supplierPaymentRepository } =
      createDefaultTestScope();
    supplierPaymentRepository.seed([buildPostedSupplierPaymentEntity()]);
    const service = new PostSupplierPaymentService(transactionRunner);

    await expect(
      service.execute({ id: SUPPLIER_PAYMENT_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("VoidSupplierPaymentService", () => {
  it("voids posted payment and reverses paidAmount", async () => {
    const {
      transactionRunner,
      supplierPaymentRepository,
      purchaseOrderRepository,
    } = createDefaultTestScope();
    const posted = buildPostedSupplierPaymentEntity();
    supplierPaymentRepository.seed([posted]);
    purchaseOrderRepository.seed([
      buildApprovedPurchaseOrderEntity().withPaymentApplied(posted.amount),
    ]);
    const service = new VoidSupplierPaymentService(transactionRunner);

    const result = await service.execute({ id: SUPPLIER_PAYMENT_ID });

    expect(result.status).toBe("VOID");

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(0);
  });

  it("voids pending payment without changing paidAmount", async () => {
    const {
      transactionRunner,
      supplierPaymentRepository,
      purchaseOrderRepository,
    } = createDefaultTestScope();
    supplierPaymentRepository.seed([buildSupplierPaymentEntity()]);
    const service = new VoidSupplierPaymentService(transactionRunner);

    await service.execute({ id: SUPPLIER_PAYMENT_ID });

    const purchaseOrder =
      await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(purchaseOrder?.paidAmount).toBe(0);
  });
});

describe("GetSupplierPaymentByIdService", () => {
  it("returns payment by id", async () => {
    const repository = new InMemorySupplierPaymentRepository();
    repository.seed([buildSupplierPaymentEntity()]);
    const service = new GetSupplierPaymentByIdService(repository);

    const result = await service.execute({ id: SUPPLIER_PAYMENT_ID });

    expect(result.id).toBe(SUPPLIER_PAYMENT_ID);
  });

  it("throws when payment does not exist", async () => {
    const service = new GetSupplierPaymentByIdService(
      new InMemorySupplierPaymentRepository(),
    );

    await expect(
      service.execute({ id: SUPPLIER_PAYMENT_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListSupplierPaymentsService", () => {
  it("filters by purchaseOrderId", async () => {
    const repository = new InMemorySupplierPaymentRepository();
    repository.seed([buildSupplierPaymentEntity()]);
    const service = new ListSupplierPaymentsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      purchaseOrderId: PURCHASE_ORDER_ID,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.purchaseOrderId).toBe(PURCHASE_ORDER_ID);
  });
});
