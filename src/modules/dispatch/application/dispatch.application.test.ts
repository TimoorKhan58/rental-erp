import { describe, expect, it } from "vitest";

import { CancelDispatchService } from "@/modules/dispatch/application/services/cancel-dispatch.service";
import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import { CreateDispatchService } from "@/modules/dispatch/application/services/create-dispatch.service";
import { GetDispatchByIdService } from "@/modules/dispatch/application/services/get-dispatch-by-id.service";
import { ListDispatchesService } from "@/modules/dispatch/application/services/list-dispatches.service";
import { UpdateDispatchService } from "@/modules/dispatch/application/services/update-dispatch.service";
import {
  DISPATCH_ENTITY_NAME,
  DISPATCH_MODULE,
} from "@/modules/dispatch/application/services/dispatch-service.constants";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import {
  buildConfirmedRentalOrderEntity,
  buildRentalOrderEntity,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
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
import type { CreateDispatchInput } from "@/modules/dispatch/application/schemas/dispatch.schemas";

import {
  DISPATCH_ID,
  OTHER_DISPATCH_ID,
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
  buildDispatchEntity,
  buildReadyDispatchEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "../tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  dispatchRepository: InMemoryDispatchRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    dispatchRepository,
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateDispatchInput;

describe("CreateDispatchService", () => {
  it("creates a dispatch and returns a DTO", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateDispatchService(
      createWriteScope(
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.dispatchNumber).toBe("DSP-2026-001");
    expect(dispatchRepository.count()).toBe(1);
  });

  it("rejects duplicate dispatch number", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateDispatchService(
      createWriteScope(
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
    const service = new CreateDispatchService(
      createWriteScope(
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
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
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
      module: DISPATCH_MODULE,
      entityName: DISPATCH_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rejects when rental order does not exist", async () => {
    const service = new CreateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
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

  it("rejects when rental order is draft", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const service = new CreateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
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
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
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
});

describe("UpdateDispatchService", () => {
  it("updates draft dispatch", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new UpdateDispatchService(
      createWriteScope(
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: DISPATCH_ID },
      { remarks: "Updated remarks" },
    );

    expect(result.remarks).toBe("Updated remarks");
  });

  it("rejects update when not draft", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const service = new UpdateDispatchService(
      createWriteScope(
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: DISPATCH_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when dispatch does not exist", async () => {
    const service = new UpdateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: DISPATCH_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("marks dispatch as ready", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchEntity()]);
    const service = new UpdateDispatchService(
      createWriteScope(
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: DISPATCH_ID },
      { markReady: true },
    );

    expect(result.status).toBe("READY");
    expect(result.readyAt).not.toBeNull();
  });

  it("rejects mark ready when not draft", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const service = new UpdateDispatchService(
      createWriteScope(
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: DISPATCH_ID }, { markReady: true }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("CompleteDispatchService", () => {
  it("completes ready dispatch with OUT stock movement", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 5,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CompleteDispatchService(
      createWriteScope(
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute({ id: DISPATCH_ID });

    expect(result.status).toBe("COMPLETED");
    expect(result.dispatchedAt).not.toBeNull();
    expect(result.completedAt).not.toBeNull();
    expect(stockMovementRepository.count()).toBe(2);

    const movements = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items;
    expect(movements.map((m) => m.movementType).sort()).toEqual([
      "OUT",
      "RELEASE",
    ]);
    expect(
      movements.every(
        (m) =>
          m.referenceType === RENTAL_ORDER_REFERENCE_TYPE &&
          m.referenceId === RENTAL_ORDER_ID,
      ),
    ).toBe(true);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(45);
    expect(inventory?.reservedQuantity).toBe(0);
    expect(inventory?.availableQuantity).toBe(45);
  });

  it("rejects complete when not ready", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CompleteDispatchService(
      createWriteScope(
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("rejects complete when inventory is missing", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CompleteDispatchService(
      createWriteScope(
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects complete without user context", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new CompleteDispatchService(
      createWriteScope(
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("writes dispatch audit log on complete", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CompleteDispatchService(
      createWriteScope(
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: DISPATCH_ID });

    expect(
      auditLogger.entries.filter((entry) => entry.module === DISPATCH_MODULE),
    ).toHaveLength(1);
    expect(auditLogger.entries.some((entry) => entry.action === "UPDATE")).toBe(
      true,
    );
  });

  it("rolls back complete changes on failure", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 2, reservedQuantity: 0 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new CompleteDispatchService(
      createRollbackTransactionRunner(
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const dispatch = await dispatchRepository.findById(DISPATCH_ID);
    expect(dispatch?.status).toBe("READY");
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("CancelDispatchService", () => {
  it("cancels draft dispatch", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchEntity()]);
    const service = new CancelDispatchService(
      createWriteScope(
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: DISPATCH_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("cancels ready dispatch", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildReadyDispatchEntity()]);
    const service = new CancelDispatchService(
      createWriteScope(
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: DISPATCH_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("rejects cancel when dispatched", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildReadyDispatchEntity().withDispatched(),
    ]);
    const service = new CancelDispatchService(
      createWriteScope(
        dispatchRepository,
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("throws when dispatch does not exist", async () => {
    const service = new CancelDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetDispatchByIdService", () => {
  it("returns dispatch by id", async () => {
    const repository = new InMemoryDispatchRepository();
    repository.seed([buildDispatchEntity()]);
    const service = new GetDispatchByIdService(repository);

    const result = await service.execute({ id: DISPATCH_ID });

    expect(result.id).toBe(DISPATCH_ID);
  });

  it("throws when dispatch does not exist", async () => {
    const service = new GetDispatchByIdService(new InMemoryDispatchRepository());

    await expect(service.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListDispatchesService", () => {
  it("returns paginated dispatches", async () => {
    const repository = new InMemoryDispatchRepository();
    repository.seed([
      buildDispatchEntity(),
      buildDispatchEntity({
        id: OTHER_DISPATCH_ID,
        status: "READY",
      }),
    ]);
    const service = new ListDispatchesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryDispatchRepository();
    repository.seed([
      buildDispatchEntity(),
      buildReadyDispatchEntity(),
    ]);
    const service = new ListDispatchesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "READY",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("READY");
  });
});

describe("CreateDispatchService domain validation", () => {
  it("rejects duplicate products before persistence", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
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
          { productId: PRODUCT_ID, quantity: 5 },
          { productId: PRODUCT_ID, quantity: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects quantity exceeding reserved quantity", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = new CreateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
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
        items: [{ productId: PRODUCT_ID, quantity: 11 }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("accepts confirmed rental order with partial reservation", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildConfirmedRentalOrderEntity().withReserved([
        { productId: PRODUCT_ID, quantity: 4 },
      ]),
    ]);
    const service = new CreateDispatchService(
      createWriteScope(
        new InMemoryDispatchRepository(),
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({
      ...VALID_CREATE_SERVICE_INPUT,
      items: [{ productId: PRODUCT_ID, quantity: 4 }],
    });

    expect(result.status).toBe("DRAFT");
  });
});
