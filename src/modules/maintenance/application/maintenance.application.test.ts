import { describe, expect, it } from "vitest";

import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { MAINTENANCE_REFERENCE_TYPE } from "@/modules/maintenance/domain";
import { CancelMaintenanceService } from "@/modules/maintenance/application/services/cancel-maintenance.service";
import { CompleteMaintenanceService } from "@/modules/maintenance/application/services/complete-maintenance.service";
import { CreateMaintenanceService } from "@/modules/maintenance/application/services/create-maintenance.service";
import { GetMaintenanceByIdService } from "@/modules/maintenance/application/services/get-maintenance-by-id.service";
import { ListMaintenancesService } from "@/modules/maintenance/application/services/list-maintenances.service";
import { StartMaintenanceService } from "@/modules/maintenance/application/services/start-maintenance.service";
import { UpdateMaintenanceService } from "@/modules/maintenance/application/services/update-maintenance.service";
import {
  MAINTENANCE_ENTITY_NAME,
  MAINTENANCE_MODULE,
} from "@/modules/maintenance/application/services/maintenance-service.constants";
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
import type { CreateMaintenanceInput } from "@/modules/maintenance/application/schemas/maintenance.schemas";

import {
  MAINTENANCE_ID,
  OTHER_MAINTENANCE_ID,
  VALID_CREATE_INPUT,
  buildCompletedMaintenanceEntity,
  buildInProgressMaintenanceEntity,
  buildMaintenanceEntity,
} from "../tests/helpers/maintenance.fixtures";
import { InMemoryMaintenanceRepository } from "../tests/helpers/in-memory-maintenance.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function buildAvailableInventory(
  override: Parameters<typeof buildInventoryEntity>[0] = {},
) {
  return buildInventoryEntity({
    id: INVENTORY_ID,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    quantityOnHand: 100,
    reservedQuantity: 10,
    ...override,
  });
}

function createWriteScope(
  maintenanceRepository: InMemoryMaintenanceRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughTransactionRunner({
    maintenanceRepository,
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
    userId,
  });
}

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateMaintenanceInput;

describe("CreateMaintenanceService", () => {
  it("creates a maintenance and returns a DTO", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.maintenanceNumber).toBe("MNT-2026-001");
    expect(result.status).toBe("SCHEDULED");
    expect(maintenanceRepository.count()).toBe(1);
  });

  it("rejects duplicate maintenance number", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([
      buildMaintenanceEntity({ status: "CANCELLED" }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, quantity: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("writes audit log on create", async () => {
    const auditLogger = new MockAuditLogger();
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({
      module: MAINTENANCE_MODULE,
      entityName: MAINTENANCE_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rejects when inventory does not exist", async () => {
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects without user context", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects quantity exceeding available inventory", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ quantityOnHand: 12, reservedQuantity: 10 }),
    ]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, quantity: 3 }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects product mismatch", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        productId: "880e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects warehouse mismatch", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({
        ...VALID_CREATE_SERVICE_INPUT,
        warehouseId: "880e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects inactive inventory", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ isActive: false }),
    ]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(VALID_CREATE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("accepts quantity within available inventory", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ quantityOnHand: 12, reservedQuantity: 10 }),
    ]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({
      ...VALID_CREATE_SERVICE_INPUT,
      quantity: 2,
    });

    expect(result.quantity).toBe(2);
  });
});

describe("UpdateMaintenanceService", () => {
  it("updates scheduled maintenance", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new UpdateMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: MAINTENANCE_ID },
      { notes: "Updated notes" },
    );

    expect(result.notes).toBe("Updated notes");
  });

  it("rejects update when not scheduled", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const service = new UpdateMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: MAINTENANCE_ID }, { notes: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("throws when maintenance does not exist", async () => {
    const service = new UpdateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: MAINTENANCE_ID }, { notes: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes audit log on update", async () => {
    const auditLogger = new MockAuditLogger();
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new UpdateMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: MAINTENANCE_ID }, { notes: "Updated" });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
  });

  it("rejects quantity exceeding available inventory on update", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity({ quantity: 1 })]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ quantityOnHand: 12, reservedQuantity: 10 }),
    ]);
    const service = new UpdateMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: MAINTENANCE_ID }, { quantity: 3 }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("StartMaintenanceService", () => {
  it("starts scheduled maintenance with OUT stock movement for MAINTENANCE reference", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 50,
        reservedQuantity: 5,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new StartMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute({ id: MAINTENANCE_ID });

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.startedAt).not.toBeNull();
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("OUT");
    expect(movement?.quantity).toBe(2);
    expect(movement?.referenceType).toBe(MAINTENANCE_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(MAINTENANCE_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(48);
  });

  it("rejects start when not scheduled", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const service = new StartMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("throws when maintenance does not exist", async () => {
    const service = new StartMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("writes audit log on start", async () => {
    const auditLogger = new MockAuditLogger();
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new StartMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: MAINTENANCE_ID });

    expect(
      auditLogger.entries.filter(
        (entry) =>
          entry.module === MAINTENANCE_MODULE && entry.action === "UPDATE",
      ),
    ).toHaveLength(1);
  });

  it("rejects start without user context", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new StartMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects start when inventory is missing", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const service = new StartMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rolls back start changes on failure", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ isActive: false }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new StartMaintenanceService(
      createRollbackTransactionRunner(
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const maintenance = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(maintenance?.status).toBe("SCHEDULED");
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("CompleteMaintenanceService", () => {
  it("completes in-progress maintenance with IN stock movement for MAINTENANCE reference", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 45,
        reservedQuantity: 5,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CompleteMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute({ id: MAINTENANCE_ID });

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
    expect(movement?.quantity).toBe(2);
    expect(movement?.referenceType).toBe(MAINTENANCE_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(MAINTENANCE_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(47);
  });

  it("rejects complete when not in progress", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const service = new CompleteMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("rejects complete when inventory is missing", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const service = new CompleteMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects complete without user context", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CompleteMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("writes maintenance audit log on complete", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const auditLogger = new MockAuditLogger();
    const service = new CompleteMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: MAINTENANCE_ID });

    expect(
      auditLogger.entries.filter(
        (entry) =>
          entry.module === MAINTENANCE_MODULE && entry.action === "UPDATE",
      ),
    ).toHaveLength(1);
  });

  it("rolls back complete changes on failure", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ isActive: false }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new CompleteMaintenanceService(
      createRollbackTransactionRunner(
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const maintenance = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(maintenance?.status).toBe("IN_PROGRESS");
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("CancelMaintenanceService", () => {
  it("cancels scheduled maintenance without stock movement", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: MAINTENANCE_ID });

    expect(result.status).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(0);
  });

  it("cancels in-progress maintenance with IN stock movement reversal", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({
        id: INVENTORY_ID,
        quantityOnHand: 48,
        reservedQuantity: 5,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const service = new CancelMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: MAINTENANCE_ID });

    expect(result.status).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("IN");
    expect(movement?.quantity).toBe(2);
    expect(movement?.referenceType).toBe(MAINTENANCE_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(MAINTENANCE_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(50);
  });

  it("rejects cancel when completed", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildCompletedMaintenanceEntity()]);
    const service = new CancelMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it("throws when maintenance does not exist", async () => {
    const service = new CancelMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("writes audit log on cancel", async () => {
    const auditLogger = new MockAuditLogger();
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const service = new CancelMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: MAINTENANCE_ID });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CANCEL");
  });

  it("rejects cancel without user context when in progress", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CancelMaintenanceService(
      createWriteScope(
        maintenanceRepository,
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        undefined,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rolls back cancel changes on failure", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ isActive: false }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const service = new CancelMaintenanceService(
      createRollbackTransactionRunner(
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const maintenance = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(maintenance?.status).toBe("IN_PROGRESS");
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("GetMaintenanceByIdService", () => {
  it("returns maintenance by id", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([buildMaintenanceEntity()]);
    const service = new GetMaintenanceByIdService(repository);

    const result = await service.execute({ id: MAINTENANCE_ID });

    expect(result.id).toBe(MAINTENANCE_ID);
  });

  it("throws when maintenance does not exist", async () => {
    const service = new GetMaintenanceByIdService(
      new InMemoryMaintenanceRepository(),
    );

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListMaintenancesService", () => {
  it("returns paginated maintenances", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([
      buildMaintenanceEntity(),
      buildMaintenanceEntity({
        id: OTHER_MAINTENANCE_ID,
        status: "IN_PROGRESS",
      }),
    ]);
    const service = new ListMaintenancesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
    });

    expect(result.items).toHaveLength(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([
      buildMaintenanceEntity(),
      buildInProgressMaintenanceEntity(),
    ]);
    const service = new ListMaintenancesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "IN_PROGRESS",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("IN_PROGRESS");
  });
});

describe("CreateMaintenanceService domain validation", () => {
  it("rejects zero quantity before persistence", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const service = new CreateMaintenanceService(
      createWriteScope(
        new InMemoryMaintenanceRepository(),
        inventoryRepository,
        new InMemoryStockMovementRepository(),
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, quantity: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
