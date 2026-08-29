import { describe, expect, it } from "vitest";

import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { MAINTENANCE_REFERENCE_TYPE } from "@/modules/maintenance/domain";
import { CancelMaintenanceService } from "@/modules/maintenance/application/services/cancel-maintenance.service";
import { StartMaintenanceService } from "@/modules/maintenance/application/services/start-maintenance.service";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import type { IMaintenanceRepository } from "@/modules/maintenance/domain/maintenance.repository.interface";
import type {
  UpdateMaintenanceStatusData,
} from "@/modules/maintenance/domain/maintenance.types";
import type { Maintenance } from "@/modules/maintenance/domain/maintenance.entity";
import type { MaintenanceId } from "@/shared/domain/ids";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { ConcurrentUpdateError, UnprocessableError } from "@/shared/infrastructure/errors";

import {
  MAINTENANCE_ID,
  buildInProgressMaintenanceEntity,
  buildMaintenanceEntity,
} from "../tests/helpers/maintenance.fixtures";
import { InMemoryMaintenanceRepository } from "../tests/helpers/in-memory-maintenance.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const BASELINE_ON_HAND = 100;
const MAINTENANCE_QUANTITY = 2;

function buildAvailableInventory(
  override: Parameters<typeof buildInventoryEntity>[0] = {},
) {
  return buildInventoryEntity({
    id: INVENTORY_ID,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    quantityOnHand: BASELINE_ON_HAND,
    reservedQuantity: 10,
    ...override,
  });
}

function buildStartService(
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

function buildCancelService(
  maintenanceRepository: InMemoryMaintenanceRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  transactionRunner = createPassThroughTransactionRunner({
    maintenanceRepository,
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
    userId: USER_ID,
  }),
) {
  return new CancelMaintenanceService(transactionRunner);
}

function countMovementsByType(
  stockMovementRepository: InMemoryStockMovementRepository,
  movementType: "OUT" | "IN",
): number {
  return Array.from(stockMovementRepository.snapshot().values()).filter(
    (movement) => movement.record.movementType === movementType,
  ).length;
}

/**
 * Yields before cancel claim so StartMaintenance can complete while cancel
 * still holds a stale pre-claim SCHEDULED read — reproduces F-36-01 interleaving.
 */
class GatedMaintenanceRepository
  extends InMemoryMaintenanceRepository
  implements IMaintenanceRepository
{
  private beforeClaimHook: (() => Promise<void>) | null = null;

  setBeforeClaimHook(hook: () => Promise<void>): void {
    this.beforeClaimHook = hook;
  }

  override async claimStatusTransition(
    id: MaintenanceId,
    expected: Maintenance["status"] | ReadonlyArray<Maintenance["status"]>,
    data: UpdateMaintenanceStatusData,
  ): Promise<Maintenance | null> {
    if (
      this.beforeClaimHook !== null &&
      data.status === "CANCELLED"
    ) {
      await this.beforeClaimHook();
      this.beforeClaimHook = null;
    }

    return super.claimStatusTransition(id, expected, data);
  }
}

describe("Phase 36 F-36-01: cancel maintenance stock reversal integrity", () => {
  it("T36.1: Start ∥ Cancel from SCHEDULED — no OUT without matching IN after cancel", async () => {
    const maintenanceRepository = new GatedMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();

    const startService = buildStartService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );
    const cancelService = buildCancelService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    maintenanceRepository.setBeforeClaimHook(async () => {
      const claimed = await maintenanceRepository.claimStatusTransition(
        MAINTENANCE_ID,
        "SCHEDULED",
        {
          status: "IN_PROGRESS",
          startedAt: new Date("2026-01-18T10:00:00.000Z"),
        },
      );
      expect(claimed).not.toBeNull();

      await executeCreateStockMovementInScope(
        {
          stockMovementRepository,
          inventoryRepository,
          auditLogger,
          userId: USER_ID,
        },
        {
          inventoryId: INVENTORY_ID,
          movementType: "OUT",
          quantity: MAINTENANCE_QUANTITY,
          referenceType: MAINTENANCE_REFERENCE_TYPE,
          referenceId: MAINTENANCE_ID,
          remarks: "Simulated concurrent start before cancel claim",
        },
      );
    });

    const results = await Promise.allSettled([
      cancelService.execute({ id: MAINTENANCE_ID }),
      startService.execute({ id: MAINTENANCE_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled.length + rejected.length).toBe(2);

    const cancelResult = fulfilled.find(
      (result) =>
        (result as PromiseFulfilledResult<{ status: string }>).value.status ===
        "CANCELLED",
    );
    expect(cancelResult).toBeDefined();

    const stored = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(stored?.status).toBe("CANCELLED");

    const outCount = countMovementsByType(stockMovementRepository, "OUT");
    const inCount = countMovementsByType(stockMovementRepository, "IN");

    if (outCount > 0) {
      expect(inCount).toBeGreaterThanOrEqual(outCount);
    }

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(BASELINE_ON_HAND);
  });

  it("T36.2: cancel from SCHEDULED — no IN, inventory unchanged", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const cancelService = buildCancelService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      new MockAuditLogger(),
    );

    const result = await cancelService.execute({ id: MAINTENANCE_ID });

    expect(result.status).toBe("CANCELLED");
    expect(stockMovementRepository.count()).toBe(0);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(BASELINE_ON_HAND);
  });

  it("T36.3: cancel from IN_PROGRESS — exactly one IN, inventory restored", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({
        quantityOnHand: BASELINE_ON_HAND - MAINTENANCE_QUANTITY,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const cancelService = buildCancelService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      new MockAuditLogger(),
    );

    const result = await cancelService.execute({ id: MAINTENANCE_ID });

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
    expect(movement?.quantity).toBe(MAINTENANCE_QUANTITY);
    expect(movement?.referenceType).toBe(MAINTENANCE_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(MAINTENANCE_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(BASELINE_ON_HAND);
  });

  it("T36.4: cancel wins before start — no OUT, start gets 409", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const startService = buildStartService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );
    const cancelService = buildCancelService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const cancelResult = await cancelService.execute({ id: MAINTENANCE_ID });
    expect(cancelResult.status).toBe("CANCELLED");

    await expect(startService.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    expect(stockMovementRepository.count()).toBe(0);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(BASELINE_ON_HAND);
  });

  it("T36.5: start wins before cancel — OUT then IN, net inventory unchanged", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildAvailableInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const startService = buildStartService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );
    const cancelService = buildCancelService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const startResult = await startService.execute({ id: MAINTENANCE_ID });
    expect(startResult.status).toBe("IN_PROGRESS");

    const cancelResult = await cancelService.execute({ id: MAINTENANCE_ID });
    expect(cancelResult.status).toBe("CANCELLED");

    expect(countMovementsByType(stockMovementRepository, "OUT")).toBe(1);
    expect(countMovementsByType(stockMovementRepository, "IN")).toBe(1);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(BASELINE_ON_HAND);
  });

  it("T36.6: post-claim IN failure rolls back cancel and inventory", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({ isActive: false }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const cancelService = buildCancelService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
      createRollbackTransactionRunner(
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(cancelService.execute({ id: MAINTENANCE_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    const maintenance = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(maintenance?.status).toBe("IN_PROGRESS");
    expect(stockMovementRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(BASELINE_ON_HAND);
  });

  it("T36.7: duplicate concurrent cancel — one success, one 409, at most one IN", async () => {
    const maintenanceRepository = new InMemoryMaintenanceRepository();
    maintenanceRepository.seed([buildInProgressMaintenanceEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildAvailableInventory({
        quantityOnHand: BASELINE_ON_HAND - MAINTENANCE_QUANTITY,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const cancelService = buildCancelService(
      maintenanceRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled([
      cancelService.execute({ id: MAINTENANCE_ID }),
      cancelService.execute({ id: MAINTENANCE_ID }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    expect(countMovementsByType(stockMovementRepository, "IN")).toBeLessThanOrEqual(1);

    const stored = await maintenanceRepository.findById(MAINTENANCE_ID);
    expect(stored?.status).toBe("CANCELLED");
  });
});
