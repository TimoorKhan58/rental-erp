import { describe, expect, it } from "vitest";

import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import {
  buildCompletedDispatchEntity,
  buildDispatchEntity,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { CancelReturnService } from "@/modules/return/application/services/cancel-return.service";
import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
import { CreateReturnService } from "@/modules/return/application/services/create-return.service";
import { GetReturnByIdService } from "@/modules/return/application/services/get-return-by-id.service";
import { InspectReturnService } from "@/modules/return/application/services/inspect-return.service";
import { ListReturnsService } from "@/modules/return/application/services/list-returns.service";
import { ReceiveReturnService } from "@/modules/return/application/services/receive-return.service";
import { RecoverLostItemsService } from "@/modules/return/application/services/recover-lost-items.service";
import { UpdateReturnService } from "@/modules/return/application/services/update-return.service";
import {
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
} from "@/modules/return/application/services/return-service.constants";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { InMemoryPaymentRepository } from "@/modules/payment/tests/helpers/in-memory-payment.repository";
import { InMemoryRentalInvoiceRepository } from "@/modules/rental-invoice/tests/helpers/in-memory-rental-invoice.repository";
import { buildPaidRentalInvoiceEntity } from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";
import type { CreateReturnInput } from "@/modules/return/application/schemas/return.schemas";

import {
  ITEM_ID,
  OTHER_RETURN_ID,
  RENTAL_ORDER_ID,
  RETURN_ID,
  VALID_CREATE_INPUT,
  buildCompletedReturnEntity,
  buildInspectedReturnEntity,
  buildReceivedReturnEntity,
  buildReturnEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "../tests/helpers/in-memory-return.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  returnRepository: InMemoryReturnRepository,
  dispatchRepository: InMemoryDispatchRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    returnRepository,
    dispatchRepository,
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    paymentRepository: new InMemoryPaymentRepository(),
    rentalInvoiceRepository: new InMemoryRentalInvoiceRepository(),
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateReturnInput;

describe("CreateReturnService", () => {
  it("creates a return and returns a DTO", async () => {
    const returnRepository = new InMemoryReturnRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.returnNumber).toBe("RTN-2026-001");
    expect(returnRepository.count()).toBe(1);
  });

  it("rejects duplicate return number", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildReturnEntity({ status: "CANCELLED" }),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects invalid input", async () => {
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
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
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: RETURN_MODULE,
      entityName: RETURN_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rejects when dispatch does not exist", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        new InMemoryDispatchRepository(),
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects when dispatch is not completed", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("rejects without user context", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects quantity exceeding dispatched amount", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        items: [{ rentalOrderItemId: ITEM_ID, quantity: 6 }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("UpdateReturnService", () => {
  it("updates draft return", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReturnEntity()]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const service = new UpdateReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RETURN_ID },
      { remarks: "Updated remarks" },
    );

    expect(result.remarks).toBe("Updated remarks");
  });

  it("rejects update when not draft", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReceivedReturnEntity()]);
    const service = new UpdateReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RETURN_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when return does not exist", async () => {
    const service = new UpdateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RETURN_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on update", async () => {
    const auditLogger = new MockAuditLogger();
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReturnEntity()]);
    const service = new UpdateReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: RETURN_ID }, { remarks: "Updated" });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });
});

describe("ReceiveReturnService", () => {
  it("receives draft return", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReturnEntity()]);
    const service = new ReceiveReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RETURN_ID });

    expect(result.status).toBe("RECEIVED");
    expect(result.receivedAt).not.toBeNull();
  });

  it("rejects receive when not draft", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReceivedReturnEntity()]);
    const service = new ReceiveReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("throws when return does not exist", async () => {
    const service = new ReceiveReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("InspectReturnService", () => {
  it("inspects received return", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReceivedReturnEntity()]);
    const service = new InspectReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RETURN_ID },
      {
        items: [
          {
            rentalOrderItemId: ITEM_ID,
            goodQuantity: 3,
            damagedQuantity: 1,
            lostQuantity: 1,
          },
        ],
      },
    );

    expect(result.status).toBe("INSPECTED");
    expect(result.inspectedAt).not.toBeNull();
    expect(result.items[0]?.goodQuantity).toBe(3);
  });

  it("rejects inspect when not received", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReturnEntity()]);
    const service = new InspectReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RETURN_ID },
        {
          items: [
            {
              rentalOrderItemId: ITEM_ID,
              goodQuantity: 5,
              damagedQuantity: 0,
              lostQuantity: 0,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects inspect when quantities do not sum to returned quantity", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReceivedReturnEntity()]);
    const service = new InspectReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RETURN_ID },
        {
          items: [
            {
              rentalOrderItemId: ITEM_ID,
              goodQuantity: 3,
              damagedQuantity: 1,
              lostQuantity: 0,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("CompleteReturnService", () => {
  it("completes inspected return with IN stock movement for good quantity only", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildInspectedReturnEntity()]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 45,
        reservedQuantity: 5,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CompleteReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RETURN_ID });

    expect(result.status).toBe("COMPLETED");
    expect(result.completedAt).not.toBeNull();
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("IN");
    expect(movement?.quantity).toBe(3);
    expect(movement?.referenceType).toBe(RENTAL_ORDER_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(RENTAL_ORDER_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(48);

    const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    expect(order?.status).toBe("PARTIALLY_RETURNED");
  });

  it("logs RETURN audit for lost items without stock movement", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildInspectedReturnEntity({
        goodQuantity: 0,
        damagedQuantity: 0,
        lostQuantity: 5,
      }),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CompleteReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: RETURN_ID });

    expect(stockMovementRepository.count()).toBe(0);
    expect(
      auditLogger.entries.filter((entry) => entry.action === "RETURN"),
    ).toHaveLength(1);
    expect(auditLogger.entries.find((entry) => entry.action === "RETURN")).toMatchObject({
      module: RETURN_MODULE,
      entityName: RETURN_ENTITY_NAME,
      newValues: {
        rentalOrderItemId: ITEM_ID,
        lostQuantity: 5,
      },
    });
  });

  it("rejects complete when not inspected", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReceivedReturnEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CompleteReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("rejects complete when inventory is missing", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildInspectedReturnEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CompleteReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects complete without user context", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildInspectedReturnEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new CompleteReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("writes return audit log on complete", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildInspectedReturnEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CompleteReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: RETURN_ID });

    expect(
      auditLogger.entries.filter(
        (entry) => entry.module === RETURN_MODULE && entry.action === "UPDATE",
      ),
    ).toHaveLength(1);
  });

  it("rolls back complete changes on failure", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildInspectedReturnEntity()]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ isActive: false }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new CompleteReturnService(
      createRollbackTransactionRunner(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        new InMemoryPaymentRepository(),
        new InMemoryRentalInvoiceRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const returnRecord = await returnRepository.findById(RETURN_ID);
    expect(returnRecord?.status).toBe("INSPECTED");
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("RecoverLostItemsService", () => {
  it("restocks recovered lost quantity and adjusts return item counts", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 48,
        reservedQuantity: 0,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new RecoverLostItemsService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RETURN_ID },
      { items: [{ rentalOrderItemId: ITEM_ID, quantity: 1 }] },
    );

    expect(result.return.items[0]?.lostQuantity).toBe(0);
    expect(result.return.items[0]?.goodQuantity).toBe(4);
    expect(result.refund).toBeNull();
    expect(stockMovementRepository.count()).toBe(1);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(49);
  });

  it("posts refund payment against paid invoice when requested", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const paymentRepository = new InMemoryPaymentRepository();
    const rentalInvoiceRepository = new InMemoryRentalInvoiceRepository();
    const paidInvoice = buildPaidRentalInvoiceEntity();
    rentalInvoiceRepository.seed([paidInvoice]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new RecoverLostItemsService(
      createPassThroughTransactionRunner({
        returnRepository,
        dispatchRepository: new InMemoryDispatchRepository(),
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        userId: USER_ID,
      }),
    );

    const result = await service.execute(
      { id: RETURN_ID },
      {
        items: [{ rentalOrderItemId: ITEM_ID, quantity: 1 }],
        refund: {
          rentalInvoiceId: paidInvoice.id,
          amount: 100,
          paymentNumber: "PAY-REFUND-001",
          paymentMethod: "CASH",
        },
      },
    );

    expect(result.refund?.isRefund).toBe(true);
    expect(result.refund?.status).toBe("POSTED");
    expect(result.refund?.amount).toBe(100);
    expect(paymentRepository.count()).toBe(1);

    const invoice = await rentalInvoiceRepository.findById(paidInvoice.id);
    expect(invoice?.paidAmount).toBe(paidInvoice.grandTotal - 100);
  });

  it("rejects recover when return is not completed", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildInspectedReturnEntity()]);
    const service = new RecoverLostItemsService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RETURN_ID },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("CancelReturnService", () => {
  it("cancels draft return", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReturnEntity()]);
    const service = new CancelReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RETURN_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("cancels received return", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildReceivedReturnEntity()]);
    const service = new CancelReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RETURN_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("rejects cancel when completed", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildInspectedReturnEntity().withCompleted()]);
    const service = new CancelReturnService(
      createWriteScope(
        returnRepository,
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("throws when return does not exist", async () => {
    const service = new CancelReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetReturnByIdService", () => {
  it("returns return by id", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([buildReturnEntity()]);
    const service = new GetReturnByIdService(repository);

    const result = await service.execute({ id: RETURN_ID });

    expect(result.id).toBe(RETURN_ID);
  });

  it("throws when return does not exist", async () => {
    const service = new GetReturnByIdService(new InMemoryReturnRepository());

    await expect(service.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListReturnsService", () => {
  it("returns paginated returns", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([
      buildReturnEntity(),
      buildReturnEntity({
        id: OTHER_RETURN_ID,
        status: "RECEIVED",
      }),
    ]);
    const service = new ListReturnsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([
      buildReturnEntity(),
      buildReceivedReturnEntity(),
    ]);
    const service = new ListReturnsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "RECEIVED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("RECEIVED");
  });
});

describe("CreateReturnService prior returns aggregation", () => {
  it("rejects when prior returns exceed remaining dispatched quantity", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildReturnEntity({
        id: OTHER_RETURN_ID,
        status: "RECEIVED",
        items: [
          {
            id: ITEM_ID,
            rentalOrderItemId: ITEM_ID,
            dispatchItemId: ITEM_ID,
            returnedQuantity: 3,
            goodQuantity: 0,
            damagedQuantity: 0,
            lostQuantity: 0,
            notes: null,
          },
        ],
      }),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        returnNumber: "RTN-2026-002",
        items: [{ rentalOrderItemId: ITEM_ID, quantity: 3 }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("accepts return within remaining dispatched quantity", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildReturnEntity({
        id: OTHER_RETURN_ID,
        status: "RECEIVED",
        items: [
          {
            id: ITEM_ID,
            rentalOrderItemId: ITEM_ID,
            dispatchItemId: ITEM_ID,
            returnedQuantity: 2,
            goodQuantity: 0,
            damagedQuantity: 0,
            lostQuantity: 0,
            notes: null,
          },
        ],
      }),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({
      ...VALID_CREATE_SERVICE_INPUT,
      returnNumber: "RTN-2026-002",
      items: [{ rentalOrderItemId: ITEM_ID, quantity: 3 }],
    });

    expect(result.status).toBe("DRAFT");
    expect(returnRepository.count()).toBe(2);
  });

  it("ignores cancelled prior returns in quantity aggregation", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildReturnEntity({
        id: OTHER_RETURN_ID,
        status: "CANCELLED",
        items: [
          {
            id: ITEM_ID,
            rentalOrderItemId: ITEM_ID,
            dispatchItemId: ITEM_ID,
            returnedQuantity: 5,
            goodQuantity: 0,
            damagedQuantity: 0,
            lostQuantity: 0,
            notes: null,
          },
        ],
      }),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({
      ...VALID_CREATE_SERVICE_INPUT,
      returnNumber: "RTN-2026-002",
    });

    expect(result.status).toBe("DRAFT");
  });
});

describe("CreateReturnService domain validation", () => {
  it("rejects duplicate rental order items before persistence", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        dispatchRepository,
        rentalOrderRepository,
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
          { rentalOrderItemId: ITEM_ID, quantity: 3 },
          { rentalOrderItemId: ITEM_ID, quantity: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects when rental order does not exist", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects when dispatch does not belong to rental order", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateReturnService(
      createWriteScope(
        new InMemoryReturnRepository(),
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        rentalOrderId: "cc0e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});
