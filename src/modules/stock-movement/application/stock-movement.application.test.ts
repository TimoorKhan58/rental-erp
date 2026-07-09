import { describe, expect, it } from "vitest";

import { CreateStockMovementService } from "@/modules/stock-movement/application/services/create-stock-movement.service";
import { GetStockMovementByIdService } from "@/modules/stock-movement/application/services/get-stock-movement-by-id.service";
import { ListStockMovementsService } from "@/modules/stock-movement/application/services/list-stock-movements.service";
import {
  STOCK_MOVEMENT_ENTITY_NAME,
  STOCK_MOVEMENT_MODULE,
} from "@/modules/stock-movement/application/services/stock-movement-service.constants";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import {
  INVENTORY_ID,
  OTHER_STOCK_MOVEMENT_ID,
  PRODUCT_ID,
  STOCK_MOVEMENT_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
  buildStockMovementEntity,
} from "../tests/helpers/stock-movement.fixtures";
import { InMemoryStockMovementRepository } from "../tests/helpers/in-memory-stock-movement.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined = USER_ID,
) {
  return createPassThroughTransactionRunner({
    stockMovementRepository,
    inventoryRepository,
    auditLogger,
    userId,
  });
}

describe("CreateStockMovementService", () => {
  it("creates IN movement and updates inventory on-hand", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: 25,
    });

    expect(result.movementType).toBe("IN");
    expect(result.previousQuantity).toBe(100);
    expect(result.newQuantity).toBe(125);
    expect(result.quantity).toBe(25);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(125);
    expect(stockMovementRepository.count()).toBe(1);
  });

  it("creates OUT movement and decreases on-hand", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "OUT",
      quantity: 30,
    });

    expect(result.previousQuantity).toBe(100);
    expect(result.newQuantity).toBe(70);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(70);
  });

  it("creates RESERVE movement and increases reserved quantity", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "RESERVE",
      quantity: 20,
    });

    expect(result.previousQuantity).toBe(10);
    expect(result.newQuantity).toBe(30);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.reservedQuantity).toBe(30);
    expect(inventory?.availableQuantity).toBe(70);
  });

  it("creates RELEASE movement and decreases reserved quantity", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "RELEASE",
      quantity: 5,
    });

    expect(result.previousQuantity).toBe(10);
    expect(result.newQuantity).toBe(5);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.reservedQuantity).toBe(5);
  });

  it("creates ADJUSTMENT movement and increases on-hand", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "ADJUSTMENT",
      quantity: 15,
    });

    expect(result.previousQuantity).toBe(100);
    expect(result.newQuantity).toBe(115);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(115);
  });

  it("persists reference fields and remarks", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.referenceType).toBe("purchase-order");
    expect(result.referenceId).toBe("PO-001");
    expect(result.remarks).toBe("Initial stock receipt");
  });

  it("writes audit log on success", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: 5,
    });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: STOCK_MOVEMENT_MODULE,
      entityName: STOCK_MOVEMENT_ENTITY_NAME,
      recordId: result.id,
      action: "CREATE",
      status: "SUCCESS",
    });
  });

  it("throws when inventory does not exist", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "IN",
        quantity: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws when inventory is inactive", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ isActive: false }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "IN",
        quantity: 5,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when userId is missing", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createPassThroughTransactionRunner({
        stockMovementRepository,
        inventoryRepository,
        auditLogger,
        userId: undefined,
      }),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "IN",
        quantity: 5,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects OUT when on-hand is insufficient", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "OUT",
        quantity: 101,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects RESERVE when available quantity is insufficient", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "RESERVE",
        quantity: 91,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects RELEASE when reserved quantity is insufficient", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "RELEASE",
        quantity: 11,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects invalid inventoryId", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await expect(
      service.execute({
        inventoryId: "bad-id",
        movementType: "IN",
        quantity: 5,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects zero quantity", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "IN",
        quantity: 0,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rolls back inventory and ledger on failure", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createRollbackTransactionRunner(
        stockMovementRepository,
        inventoryRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "OUT",
        quantity: 200,
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(100);
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("supports sequential movements updating inventory correctly", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: 50,
    });
    await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "RESERVE",
      quantity: 30,
    });
    await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "OUT",
      quantity: 20,
    });

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(130);
    expect(inventory?.reservedQuantity).toBe(40);
    expect(stockMovementRepository.count()).toBe(3);
  });

  it("copies product and warehouse from inventory record", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventoryEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateStockMovementService(
      createWriteScope(
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
      ),
    );

    const result = await service.execute({
      inventoryId: INVENTORY_ID,
      movementType: "IN",
      quantity: 1,
    });

    expect(result.productId).toBe(PRODUCT_ID);
    expect(result.warehouseId).toBe(WAREHOUSE_ID);
    expect(result.createdById).toBe(USER_ID);
  });
});

describe("GetStockMovementByIdService", () => {
  it("returns stock movement DTO when found", async () => {
    const repository = new InMemoryStockMovementRepository();
    repository.seed([buildStockMovementEntity()]);
    const service = new GetStockMovementByIdService(repository);

    const result = await service.execute({ id: STOCK_MOVEMENT_ID });

    expect(result.id).toBe(STOCK_MOVEMENT_ID);
    expect(result.movementType).toBe("IN");
  });

  it("throws when stock movement does not exist", async () => {
    const repository = new InMemoryStockMovementRepository();
    const service = new GetStockMovementByIdService(repository);

    await expect(
      service.execute({ id: STOCK_MOVEMENT_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ListStockMovementsService", () => {
  it("returns paginated stock movements", async () => {
    const repository = new InMemoryStockMovementRepository();
    repository.seed([
      buildStockMovementEntity(),
      buildStockMovementEntity({
        id: OTHER_STOCK_MOVEMENT_ID,
        movementType: "OUT",
        previousQuantity: 110,
        newQuantity: 100,
        quantity: 10,
      }),
    ]);
    const service = new ListStockMovementsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it("filters by inventoryId", async () => {
    const repository = new InMemoryStockMovementRepository();
    repository.seed([buildStockMovementEntity()]);
    const service = new ListStockMovementsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      inventoryId: INVENTORY_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters by productId", async () => {
    const repository = new InMemoryStockMovementRepository();
    repository.seed([buildStockMovementEntity()]);
    const service = new ListStockMovementsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      productId: PRODUCT_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters by warehouseId", async () => {
    const repository = new InMemoryStockMovementRepository();
    repository.seed([buildStockMovementEntity()]);
    const service = new ListStockMovementsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      warehouseId: WAREHOUSE_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters by movementType", async () => {
    const repository = new InMemoryStockMovementRepository();
    repository.seed([
      buildStockMovementEntity({ movementType: "IN" }),
      buildStockMovementEntity({
        id: OTHER_STOCK_MOVEMENT_ID,
        movementType: "OUT",
        previousQuantity: 110,
        newQuantity: 100,
      }),
    ]);
    const service = new ListStockMovementsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      movementType: "OUT",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.movementType).toBe("OUT");
  });
});
