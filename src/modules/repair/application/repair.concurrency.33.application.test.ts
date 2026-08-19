import { describe, expect, it } from "vitest";

import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { REPAIR_REFERENCE_TYPE } from "@/modules/repair/domain";
import { CompleteRepairService } from "@/modules/repair/application/services/complete-repair.service";
import { StartRepairService } from "@/modules/repair/application/services/start-repair.service";
import {
  REPAIR_ENTITY_NAME,
  REPAIR_MODULE,
} from "@/modules/repair/application/services/repair-service.constants";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
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
  OTHER_REPAIR_ID,
  REPAIR_ID,
  buildInProgressRepairEntity,
  buildRepairEntity,
} from "../tests/helpers/repair.fixtures";
import { InMemoryRepairRepository } from "../tests/helpers/in-memory-repair.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

function buildInventory(
  override: Parameters<typeof buildInventoryEntity>[0] = {},
) {
  return buildInventoryEntity({
    id: INVENTORY_ID,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    quantityOnHand: 45,
    reservedQuantity: 5,
    ...override,
  });
}

function buildCompleteRepairService(
  repairRepository: InMemoryRepairRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
) {
  return new CompleteRepairService(
    createPassThroughTransactionRunner({
      repairRepository,
      returnRepository: new InMemoryReturnRepository(),
      rentalOrderRepository: new InMemoryRentalOrderRepository(),
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
      userId: USER_ID,
    }),
  );
}

function buildStartRepairService(
  repairRepository: InMemoryRepairRepository,
  auditLogger: MockAuditLogger,
) {
  return new StartRepairService(
    createPassThroughTransactionRunner({
      repairRepository,
      returnRepository: new InMemoryReturnRepository(),
      rentalOrderRepository: new InMemoryRentalOrderRepository(),
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      auditLogger,
      userId: USER_ID,
    }),
  );
}

describe("Phase 33 repair claim-before-side-effects", () => {
  it("T33.3: only one concurrent complete succeeds; exactly one IN movement", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = buildCompleteRepairService(
      repairRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled([
      service.execute({ id: REPAIR_ID }),
      service.execute({ id: REPAIR_ID }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await repairRepository.findById(REPAIR_ID);
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
    expect(movement?.referenceType).toBe(REPAIR_REFERENCE_TYPE);
    expect(movement?.referenceId).toBe(REPAIR_ID);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(46);
  });

  it("T33.1c: only one concurrent repair start succeeds; one 409", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildRepairEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = buildStartRepairService(repairRepository, auditLogger);

    const results = await Promise.allSettled([
      service.execute({ id: REPAIR_ID }),
      service.execute({ id: REPAIR_ID }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await repairRepository.findById(REPAIR_ID);
    expect(stored?.status).toBe("IN_PROGRESS");

    const repairAudits = auditLogger.entries.filter(
      (entry) =>
        entry.module === REPAIR_MODULE &&
        entry.entityName === REPAIR_ENTITY_NAME &&
        entry.action === "UPDATE",
    );
    expect(repairAudits).toHaveLength(1);
  });

  it("T33.6: retry after successful repair complete returns 422 without duplicate stock", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([buildInProgressRepairEntity()]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([buildInventory()]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = buildCompleteRepairService(
      repairRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    await service.execute({ id: REPAIR_ID });

    await expect(service.execute({ id: REPAIR_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );

    expect(stockMovementRepository.count()).toBe(1);
    const stored = await repairRepository.findById(REPAIR_ID);
    expect(stored?.status).toBe("COMPLETED");
  });

  it("T33.7: concurrent start on different repair records both succeed", async () => {
    const repairRepository = new InMemoryRepairRepository();
    repairRepository.seed([
      buildRepairEntity({ id: REPAIR_ID }),
      buildRepairEntity({ id: OTHER_REPAIR_ID }),
    ]);
    const auditLogger = new MockAuditLogger();
    const service = buildStartRepairService(repairRepository, auditLogger);

    const results = await Promise.allSettled([
      service.execute({ id: REPAIR_ID }),
      service.execute({ id: OTHER_REPAIR_ID }),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const first = await repairRepository.findById(REPAIR_ID);
    const second = await repairRepository.findById(OTHER_REPAIR_ID);
    expect(first?.status).toBe("IN_PROGRESS");
    expect(second?.status).toBe("IN_PROGRESS");
  });
});
