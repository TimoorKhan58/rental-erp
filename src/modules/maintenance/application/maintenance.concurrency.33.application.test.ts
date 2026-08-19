import { describe, expect, it } from "vitest";

import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { MAINTENANCE_REFERENCE_TYPE } from "@/modules/maintenance/domain";
import { CompleteMaintenanceService } from "@/modules/maintenance/application/services/complete-maintenance.service";
import { StartMaintenanceService } from "@/modules/maintenance/application/services/start-maintenance.service";
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
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import {
  MAINTENANCE_ID,
  OTHER_MAINTENANCE_ID,
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

function buildStartMaintenanceService(
  maintenanceRepository: InMemoryMaintenanceRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
) {
  return new StartMaintenanceService(
    createPassThroughTransactionRunner({
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
      userId: USER_ID,
    }),
  );
}

function buildCompleteMaintenanceService(
  maintenanceRepository: InMemoryMaintenanceRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
) {
  return new CompleteMaintenanceService(
    createPassThroughTransactionRunner({
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
      userId: USER_ID,
    }),
  );
}

describe("Phase 33 maintenance claim-before-side-effects", () => {
  it("T33.1: only one concurrent start succeeds; exactly one OUT movement", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = buildStartMaintenanceService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled([
      service.execute({ id: MAINTENANCE_ID }),
      service.execute({ id: MAINTENANCE_ID }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(stored?.status).toBe("IN_PROGRESS");
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("OUT");
    expect(movement?.referenceType).toBe(MAINTENANCE_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(MAINTENANCE_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(98);

    const maintenanceAudits = auditLogger.entries.filter(
      (entry) =>
        entry.module === MAINTENANCE_MODULE &&
        entry.entityName === MAINTENANCE_ENTITY_NAME &&
        entry.action === "UPDATE",
    );
    expect(maintenanceAudits).toHaveLength(1);
  });

  it("T33.2: only one concurrent complete succeeds; exactly one IN movement", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({
        quantityOnHand: 45,
        reservedQuantity: 5,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = buildCompleteMaintenanceService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled([
      service.execute({ id: MAINTENANCE_ID }),
      service.execute({ id: MAINTENANCE_ID }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(stored?.status).toBe("COMPLETED");
    expect(stockMovementRepository.count()).toBe(1);

    const movement = (
      await stockMovementRepository.findPaged({
        page: 1,
        pageSize: 10,
        sortOrder: "desc",
      })
    ).items[0];
    expect(movement?.movementType).toBe("IN");

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(47);
  });

  it("T33.4: concurrent start wins; invalid complete gets 422 with no stock", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const startService = buildStartMaintenanceService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );
    const completeService = buildCompleteMaintenanceService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled([
      startService.execute({ id: MAINTENANCE_ID }),
      completeService.execute({ id: MAINTENANCE_ID }),
    ]);

    const startResult = results.find(
      (r) =>
        r.status === "fulfilled" &&
        (r as PromiseFulfilledResult<{ status: string }>).value.status ===
          "IN_PROGRESS",
    );
    const completeResult = results.find((r) => r.status === "rejected");

    expect(startResult).toBeDefined();
    expect(completeResult).toBeDefined();
    expect((completeResult as PromiseRejectedResult).reason).toBeInstanceOf(
      UnprocessableError,
    );
    expect(stockMovementRepository.count()).toBe(1);

    const stored = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(stored?.status).toBe("IN_PROGRESS");
  });

  it("T33.5: rollback after successful claim when stock operation fails", async () => {
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

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(100);
  });

  it("T33.6: retry after successful start returns 422 without duplicate stock", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = buildStartMaintenanceService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    await service.execute({ id: MAINTENANCE_ID });

    await expect(service.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    expect(stockMovementRepository.count()).toBe(1);
    const stored = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(stored?.status).toBe("IN_PROGRESS");
  });

  it("T33.7: concurrent start on different maintenance records both succeed", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([
      buildMaintenanceEntity({ id: MAINTENANCE_ID }),
      buildMaintenanceEntity({ id: OTHER_MAINTENANCE_ID }),
    ]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = buildStartMaintenanceService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled([
      service.execute({ id: MAINTENANCE_ID }),
      service.execute({ id: OTHER_MAINTENANCE_ID }),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(stockMovementRepository.count()).toBe(2);

    const first = await maintenanceRepository.findById(MAINTENANCE_ID);
    const second = await maintenanceRepository.findById(OTHER_MAINTENANCE_ID);
    expect(first?.status).toBe("IN_PROGRESS");
    expect(second?.status).toBe("IN_PROGRESS");
  });
});
