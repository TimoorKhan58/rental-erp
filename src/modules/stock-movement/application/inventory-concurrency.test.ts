import { describe, expect, it } from "vitest";

import { CreateStockMovementService } from "@/modules/stock-movement/application/services/create-stock-movement.service";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import {
  INVENTORY_ID,
  USER_ID,
} from "../tests/helpers/stock-movement.fixtures";
import { InMemoryStockMovementRepository } from "../tests/helpers/in-memory-stock-movement.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

function createService(
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
) {
  return new CreateStockMovementService(
    createPassThroughTransactionRunner({
      stockMovementRepository,
      inventoryRepository,
      auditLogger,
      userId: USER_ID,
    }),
  );
}

describe("Inventory concurrency control", () => {
  it("serializes concurrent RESERVE movements without overselling", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = createService(
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.execute({
          inventoryId: INVENTORY_ID,
          movementType: "RESERVE",
          quantity: 2,
        }),
      ),
    );

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(5);

    for (const result of rejected) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(UnprocessableError);
      }
    }

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(10);
    expect(inventory?.reservedQuantity).toBe(10);
    expect(inventory?.availableQuantity).toBe(0);
    expect(stockMovementRepository.count()).toBe(5);
  });

  it("serializes concurrent OUT movements without negative on-hand", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = createService(
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        service.execute({
          inventoryId: INVENTORY_ID,
          movementType: "OUT",
          quantity: 2,
        }),
      ),
    );

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(3);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(0);
    expect(inventory?.reservedQuantity).toBe(0);
    expect(stockMovementRepository.count()).toBe(5);
  });

  it("serializes concurrent ADJUSTMENT movements without lost updates", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = createService(
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        service.execute({
          inventoryId: INVENTORY_ID,
          movementType: "ADJUSTMENT",
          quantity: -1,
        }),
      ),
    );

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(80);
    expect(stockMovementRepository.count()).toBe(20);
  });

  it("serializes concurrent return-style IN restocks without lost updates", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 40, reservedQuantity: 0 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const service = createService(
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    );

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.execute({
          inventoryId: INVENTORY_ID,
          movementType: "IN",
          quantity: 3,
        }),
      ),
    );

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(70);
    expect(stockMovementRepository.count()).toBe(10);
  });

  it("serializes interleaved RESERVE and RELEASE without corrupting reserved qty", async () => {
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({ quantityOnHand: 20, reservedQuantity: 0 }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const auditLogger = new MockAuditLogger();
    const scope = {
      stockMovementRepository,
      inventoryRepository,
      auditLogger,
      userId: USER_ID,
    };

    await executeCreateStockMovementInScope(scope, {
      inventoryId: INVENTORY_ID,
      movementType: "RESERVE",
      quantity: 10,
    });

    const results = await Promise.allSettled([
      executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "RELEASE",
        quantity: 4,
      }),
      executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "RESERVE",
        quantity: 5,
      }),
      executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "RELEASE",
        quantity: 3,
      }),
      executeCreateStockMovementInScope(scope, {
        inventoryId: INVENTORY_ID,
        movementType: "OUT",
        quantity: 2,
      }),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    // Start reserved 10; -4 release → 6; +5 reserve → 11; -3 release → 8; OUT leaves reserved.
    expect(inventory?.reservedQuantity).toBe(8);
    expect(inventory?.quantityOnHand).toBe(18);
  });
});
