import { describe, expect, it } from "vitest";

import { ApprovePurchaseOrderService } from "@/modules/procurement/application/services/approve-purchase-order.service";
import { CancelPurchaseOrderService } from "@/modules/procurement/application/services/cancel-purchase-order.service";
import { CreatePurchaseOrderService } from "@/modules/procurement/application/services/create-purchase-order.service";
import { GetPurchaseOrderByIdService } from "@/modules/procurement/application/services/get-purchase-order-by-id.service";
import { ListPurchaseOrdersService } from "@/modules/procurement/application/services/list-purchase-orders.service";
import { ReceivePurchaseOrderService } from "@/modules/procurement/application/services/receive-purchase-order.service";
import { UpdatePurchaseOrderService } from "@/modules/procurement/application/services/update-purchase-order.service";
import {
  PURCHASE_ORDER_ENTITY_NAME,
  PURCHASE_ORDER_MODULE,
} from "@/modules/procurement/application/services/purchase-order-service.constants";
import { PURCHASE_ORDER_REFERENCE_TYPE } from "@/modules/procurement/domain/purchase-order.constants";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";
import type { CreatePurchaseOrderInput } from "@/modules/procurement/application/schemas/purchase-order.schemas";

import {
  PURCHASE_ORDER_ID,
  VALID_CREATE_INPUT,
  buildApprovedPurchaseOrderEntity,
  buildPartiallyReceivedPurchaseOrderEntity,
  buildPurchaseOrderEntity,
} from "../tests/helpers/purchase-order.fixtures";
import { InMemoryPurchaseOrderRepository } from "../tests/helpers/in-memory-purchase-order.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  purchaseOrderRepository: InMemoryPurchaseOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    purchaseOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreatePurchaseOrderInput;

describe("CreatePurchaseOrderService", () => {
  it("creates a purchase order and returns a DTO", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreatePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.poNumber).toBe("PO-2026-001");
    expect(purchaseOrderRepository.count()).toBe(1);
  });

  it("rejects duplicate PO number", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildPurchaseOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreatePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects invalid input", async () => {
    const service = new CreatePurchaseOrderService(
      createWriteScope(
        new InMemoryPurchaseOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, items: [] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const service = new CreatePurchaseOrderService(
      createWriteScope(
        new InMemoryPurchaseOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: PURCHASE_ORDER_MODULE,
      entityName: PURCHASE_ORDER_ENTITY_NAME,
      action: "CREATE",
    });
  });
});

describe("UpdatePurchaseOrderService", () => {
  it("updates draft purchase order", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildPurchaseOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdatePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: PURCHASE_ORDER_ID },
      { remarks: "Updated remarks" },
    );

    expect(result.remarks).toBe("Updated remarks");
  });

  it("rejects update when not draft", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = new UpdatePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PURCHASE_ORDER_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when purchase order does not exist", async () => {
    const service = new UpdatePurchaseOrderService(
      createWriteScope(
        new InMemoryPurchaseOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PURCHASE_ORDER_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ApprovePurchaseOrderService", () => {
  it("approves draft purchase order", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildPurchaseOrderEntity()]);
    const service = new ApprovePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: PURCHASE_ORDER_ID });

    expect(result.status).toBe("APPROVED");
  });

  it("rejects approve when not draft", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = new ApprovePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PURCHASE_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("CancelPurchaseOrderService", () => {
  it("cancels draft purchase order", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildPurchaseOrderEntity()]);
    const service = new CancelPurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: PURCHASE_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("rejects cancel when partially received", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildPartiallyReceivedPurchaseOrderEntity()]);
    const service = new CancelPurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PURCHASE_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("ReceivePurchaseOrderService", () => {
  it("receives stock and creates IN stock movement", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 50,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: PURCHASE_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 25 }] },
    );

    expect(result.status).toBe("PARTIALLY_RECEIVED");
    expect(result.items[0]?.receivedQuantity).toBe(25);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(75);
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("IN");
    expect(movement?.referenceType).toBe(PURCHASE_ORDER_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(PURCHASE_ORDER_ID);
  });

  it("marks purchase order as received when fully received", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: PURCHASE_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
    );

    expect(result.status).toBe("RECEIVED");
  });

  it("rejects receive when inventory is missing", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: PURCHASE_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects receive without user context", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(
      service.execute(
        { id: PURCHASE_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects receive when purchase order is draft", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: PURCHASE_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("writes purchase order and stock movement audit logs", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(
      { id: PURCHASE_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
    );

    expect(
      auditLogger.entries.filter((entry) => entry.action === "UPDATE").length,
    ).toBeGreaterThan(0);
    expect(auditLogger.entries.some((entry) => entry.action === "CREATE")).toBe(
      true,
    );
  });

  it("rolls back receive changes on failure", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new ReceivePurchaseOrderService(
      createRollbackTransactionRunner(
        purchaseOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: PURCHASE_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 200 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const order = await purchaseOrderRepository.findById(PURCHASE_ORDER_ID);
    expect(order?.status).toBe("APPROVED");
    expect(order?.items[0]?.receivedQuantity).toBe(0);
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetPurchaseOrderByIdService", () => {
  it("returns purchase order by id", async () => {
    const repository = new InMemoryPurchaseOrderRepository();
    repository.seed([buildPurchaseOrderEntity()]);
    const service = new GetPurchaseOrderByIdService(repository);

    const result = await service.execute({ id: PURCHASE_ORDER_ID });

    expect(result.id).toBe(PURCHASE_ORDER_ID);
  });

  it("throws when purchase order does not exist", async () => {
    const service = new GetPurchaseOrderByIdService(
      new InMemoryPurchaseOrderRepository(),
    );

    await expect(
      service.execute({ id: PURCHASE_ORDER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListPurchaseOrdersService", () => {
  it("returns paginated purchase orders", async () => {
    const repository = new InMemoryPurchaseOrderRepository();
    repository.seed([
      buildPurchaseOrderEntity(),
      buildPurchaseOrderEntity({
        id: "aa0e8400-e29b-41d4-a716-446655440002" as typeof PURCHASE_ORDER_ID,
        status: "APPROVED",
      }),
    ]);
    const service = new ListPurchaseOrdersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryPurchaseOrderRepository();
    repository.seed([
      buildPurchaseOrderEntity(),
      buildApprovedPurchaseOrderEntity(),
    ]);
    const service = new ListPurchaseOrdersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "APPROVED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("APPROVED");
  });
});

describe("CreatePurchaseOrderService domain validation", () => {
  it("rejects duplicate products before persistence", async () => {
    const service = new CreatePurchaseOrderService(
      createWriteScope(
        new InMemoryPurchaseOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        items: [
          { productId: PRODUCT_ID, quantity: 10, unitCost: 10 },
          { productId: PRODUCT_ID, quantity: 5, unitCost: 12 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("ReceivePurchaseOrderService inventory state", () => {
  it("rejects receive when inventory is inactive", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildApprovedPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ isActive: false }),
    ]);
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: PURCHASE_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("supports second partial receive on same purchase order", async () => {
    const purchaseOrderRepository = new InMemoryPurchaseOrderRepository();
    purchaseOrderRepository.seed([buildPartiallyReceivedPurchaseOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity({ quantityOnHand: 140 })]);
    const service = new ReceivePurchaseOrderService(
      createWriteScope(
        purchaseOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: PURCHASE_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 60 }] },
    );

    expect(result.items[0]?.receivedQuantity).toBe(100);
    expect(result.status).toBe("RECEIVED");
  });
});

describe("ApprovePurchaseOrderService not found", () => {
  it("throws when purchase order does not exist", async () => {
    const service = new ApprovePurchaseOrderService(
      createWriteScope(
        new InMemoryPurchaseOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: PURCHASE_ORDER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
