import { describe, expect, it } from "vitest";

import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { ConfirmRentalOrderService } from "@/modules/rental-order/application/services/confirm-rental-order.service";
import { CreateRentalOrderService } from "@/modules/rental-order/application/services/create-rental-order.service";
import { GetRentalOrderByIdService } from "@/modules/rental-order/application/services/get-rental-order-by-id.service";
import { ListRentalOrdersService } from "@/modules/rental-order/application/services/list-rental-orders.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import { UpdateRentalOrderService } from "@/modules/rental-order/application/services/update-rental-order.service";
import {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
} from "@/modules/rental-order/application/services/rental-order-service.constants";
import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
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
import type { CreateRentalOrderInput } from "@/modules/rental-order/application/schemas/rental-order.schemas";

import {
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
  buildConfirmedRentalOrderEntity,
  buildPartiallyReservedConfirmedEntity,
  buildRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateRentalOrderInput;

describe("CreateRentalOrderService", () => {
  it("creates a rental order and returns a DTO", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.orderNumber).toBe("RO-2026-001");
    expect(rentalOrderRepository.count()).toBe(1);
  });

  it("rejects duplicate order number", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
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
    const service = new CreateRentalOrderService(
      createWriteScope(
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
    const service = new CreateRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: RENTAL_ORDER_MODULE,
      entityName: RENTAL_ORDER_ENTITY_NAME,
      action: "CREATE",
    });
  });
});

describe("UpdateRentalOrderService", () => {
  it("updates draft rental order", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { remarks: "Updated remarks" },
    );

    expect(result.remarks).toBe("Updated remarks");
  });

  it("rejects update when not draft", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const service = new UpdateRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when rental order does not exist", async () => {
    const service = new UpdateRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }, { remarks: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ConfirmRentalOrderService", () => {
  it("confirms draft rental order", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const service = new ConfirmRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CONFIRMED");
  });

  it("rejects confirm when not draft", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const service = new ConfirmRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when rental order does not exist", async () => {
    const service = new ConfirmRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("CancelRentalOrderService", () => {
  it("cancels draft rental order", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.status).toBe("CANCELLED");
  });

  it("rejects cancel when partially reserved", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildPartiallyReservedConfirmedEntity()]);
    const service = new CancelRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("ReserveRentalOrderService", () => {
  it("reserves stock and creates RESERVE stock movement", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 0,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );

    expect(result.status).toBe("CONFIRMED");
    expect(result.items[0]?.reservedQuantity).toBe(5);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.reservedQuantity).toBe(5);
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("RESERVE");
    expect(movement?.referenceType).toBe(RENTAL_ORDER_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(RENTAL_ORDER_ID);
  });

  it("marks rental order as reserved when fully reserved", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity({ reservedQuantity: 0 })]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
    );

    expect(result.status).toBe("RESERVED");
  });

  it("rejects reserve when inventory is missing", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects reserve without user context", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects reserve when rental order is draft", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("writes rental order and stock movement audit logs", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
    );

    expect(
      auditLogger.entries.filter((entry) => entry.action === "UPDATE").length,
    ).toBeGreaterThan(0);
    expect(auditLogger.entries.some((entry) => entry.action === "CREATE")).toBe(
      true,
    );
  });

  it("rolls back reserve changes on failure", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 50, reservedQuantity: 45 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new ReserveRentalOrderService(
      createRollbackTransactionRunner(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    expect(order?.status).toBe("CONFIRMED");
    expect(order?.items[0]?.reservedQuantity).toBe(0);
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetRentalOrderByIdService", () => {
  it("returns rental order by id", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([buildRentalOrderEntity()]);
    const service = new GetRentalOrderByIdService(repository);

    const result = await service.execute({ id: RENTAL_ORDER_ID });

    expect(result.id).toBe(RENTAL_ORDER_ID);
  });

  it("throws when rental order does not exist", async () => {
    const service = new GetRentalOrderByIdService(
      new InMemoryRentalOrderRepository(),
    );

    await expect(
      service.execute({ id: RENTAL_ORDER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListRentalOrdersService", () => {
  it("returns paginated rental orders", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([
      buildRentalOrderEntity(),
      buildRentalOrderEntity({
        id: "aa0e8400-e29b-41d4-a716-446655440002" as typeof RENTAL_ORDER_ID,
        status: "CONFIRMED",
      }),
    ]);
    const service = new ListRentalOrdersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([
      buildRentalOrderEntity(),
      buildConfirmedRentalOrderEntity(),
    ]);
    const service = new ListRentalOrdersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "CONFIRMED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("CONFIRMED");
  });
});

describe("CreateRentalOrderService domain validation", () => {
  it("rejects duplicate products before persistence", async () => {
    const service = new CreateRentalOrderService(
      createWriteScope(
        new InMemoryRentalOrderRepository(),
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
          { productId: PRODUCT_ID, quantity: 10, dailyRate: 10 },
          { productId: PRODUCT_ID, quantity: 5, dailyRate: 12 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("ReserveRentalOrderService inventory state", () => {
  it("rejects reserve when inventory is inactive", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildConfirmedRentalOrderEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ isActive: false }),
    ]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("supports second partial reserve on same rental order", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildPartiallyReservedConfirmedEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 4 }),
    ]);
    const service = new ReserveRentalOrderService(
      createWriteScope(
        rentalOrderRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 6 }] },
    );

    expect(result.items[0]?.reservedQuantity).toBe(10);
    expect(result.status).toBe("RESERVED");
  });
});
