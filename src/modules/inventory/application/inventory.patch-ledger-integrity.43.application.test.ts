import { describe, expect, it, vi } from "vitest";

import { UpdateInventorySchema } from "@/modules/inventory/application/schemas/inventory.schemas";
import { UpdateInventoryService } from "@/modules/inventory/application/services/update-inventory.service";
import { CreateStockMovementService } from "@/modules/stock-movement/application/services/create-stock-movement.service";
import { parseRequest } from "@/shared/application/validation";
import {
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import {
  INVENTORY_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { MockAuditLogger } from "@/modules/inventory/tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "@/modules/inventory/tests/helpers/transaction-test-runner";
import { USER_ID } from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  createPassThroughTransactionRunner as createStockMovementRunner,
  createRollbackTransactionRunner as createStockMovementRollbackRunner,
} from "@/modules/stock-movement/tests/helpers/transaction-test-runner";

function createInventoryUpdateService(
  repository = new InMemoryInventoryRepository(),
  auditLogger = new MockAuditLogger(),
) {
  repository.seed([buildInventoryEntity()]);
  return {
    repository,
    auditLogger,
    service: new UpdateInventoryService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    ),
  };
}

function createAdjustmentService(
  inventoryRepository = new InMemoryInventoryRepository(),
  stockMovementRepository = new InMemoryStockMovementRepository(),
  auditLogger = new MockAuditLogger(),
) {
  inventoryRepository.seed([buildInventoryEntity()]);
  return new CreateStockMovementService(
    createStockMovementRunner({
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
      userId: USER_ID,
    }),
  );
}

describe("Phase 43 F-31-08: inventory PATCH ledger integrity", () => {
  describe("T43.1 PATCH metadata remains allowed", () => {
    it("updates minimumStock without changing counters", async () => {
      const { service, repository } = createInventoryUpdateService();

      const result = await service.execute(
        { id: INVENTORY_ID },
        { minimumStock: 30 },
      );

      expect(result.minimumStock).toBe(30);
      expect(result.quantityOnHand).toBe(100);
      expect(result.reservedQuantity).toBe(10);

      const stored = await repository.findById(INVENTORY_ID);
      expect(stored?.quantityOnHand).toBe(100);
      expect(stored?.reservedQuantity).toBe(10);
    });
  });

  describe("T43.2–T43.4 PATCH counter rejection", () => {
    it("T43.2 rejects quantityOnHand in schema", () => {
      expect(() =>
        parseRequest(UpdateInventorySchema, { quantityOnHand: 500 }),
      ).toThrow(ValidationError);
    });

    it("T43.3 rejects reservedQuantity in schema", () => {
      expect(() =>
        parseRequest(UpdateInventorySchema, { reservedQuantity: 50 }),
      ).toThrow(ValidationError);
    });

    it("T43.4 rejects both counter fields in schema", () => {
      expect(() =>
        parseRequest(UpdateInventorySchema, {
          quantityOnHand: 500,
          reservedQuantity: 50,
        }),
      ).toThrow(ValidationError);
    });

    it("T43.10 PATCH cannot bypass reservedQuantity workflow via service input", async () => {
      const { service, repository } = createInventoryUpdateService();

      await expect(
        service.execute(
          { id: INVENTORY_ID },
          { reservedQuantity: 99 } as never,
        ),
      ).rejects.toBeInstanceOf(ValidationError);

      expect((await repository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        10,
      );
    });
  });

  describe("T43.5–T43.8 ADJUSTMENT ledger path", () => {
    it("T43.5 ADJUSTMENT changes quantityOnHand via delta", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([buildInventoryEntity()]);
      const service = createAdjustmentService(inventoryRepository);

      const result = await service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "ADJUSTMENT",
        quantity: 12,
      });

      expect(result.newQuantity).toBe(112);
      expect((await inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand).toBe(
        112,
      );
    });

    it("T43.6 ADJUSTMENT creates stock movement ledger entry", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      const stockMovementRepository = new InMemoryStockMovementRepository();
      inventoryRepository.seed([buildInventoryEntity()]);
      const service = createAdjustmentService(
        inventoryRepository,
        stockMovementRepository,
      );

      const result = await service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "ADJUSTMENT",
        quantity: 7,
        remarks: "Cycle count",
      });

      expect(stockMovementRepository.count()).toBe(1);
      const movement = await stockMovementRepository.findById(result.id);
      expect(movement?.movementType).toBe("ADJUSTMENT");
      expect(movement?.quantity).toBe(7);
    });

    it("T43.7 ADJUSTMENT inventory mutation and ledger entry commit together", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      const stockMovementRepository = new InMemoryStockMovementRepository();
      inventoryRepository.seed([buildInventoryEntity()]);
      const service = createAdjustmentService(
        inventoryRepository,
        stockMovementRepository,
      );

      await service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "ADJUSTMENT",
        quantity: 5,
      });

      expect(stockMovementRepository.count()).toBe(1);
      expect((await inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand).toBe(
        105,
      );
    });

    it("T43.8 failed adjustment rolls back inventory and movement", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const auditLogger = new MockAuditLogger();
      inventoryRepository.seed([buildInventoryEntity()]);
      const service = new CreateStockMovementService(
        createStockMovementRollbackRunner(
          stockMovementRepository,
          inventoryRepository,
          auditLogger,
          USER_ID,
        ),
      );

      await expect(
        service.execute({
          inventoryId: INVENTORY_ID,
          movementType: "ADJUSTMENT",
          quantity: -200,
        }),
      ).rejects.toBeInstanceOf(UnprocessableError);

      expect((await inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand).toBe(
        100,
      );
      expect(stockMovementRepository.count()).toBe(0);
      expect(auditLogger.entries).toHaveLength(0);
    });
  });

  describe("T43.9 reservedQuantity workflow integrity", () => {
    it("RESERVE workflow still modifies reservedQuantity", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      const stockMovementRepository = new InMemoryStockMovementRepository();
      inventoryRepository.seed([buildInventoryEntity()]);
      const service = createAdjustmentService(
        inventoryRepository,
        stockMovementRepository,
      );

      await service.execute({
        inventoryId: INVENTORY_ID,
        movementType: "RESERVE",
        quantity: 15,
      });

      expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        25,
      );
      expect(stockMovementRepository.count()).toBe(1);
    });
  });

  describe("T43.12 stock workflow regression guard", () => {
    it("metadata PATCH leaves counters unchanged while OUT still applies delta", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      const stockMovementRepository = new InMemoryStockMovementRepository();
      inventoryRepository.seed([buildInventoryEntity()]);
      const updateService = new UpdateInventoryService(
        createPassThroughTransactionRunner({
          repository: inventoryRepository,
          auditLogger: new MockAuditLogger(),
        }),
      );
      const movementService = createAdjustmentService(
        inventoryRepository,
        stockMovementRepository,
      );

      await updateService.execute({ id: INVENTORY_ID }, { minimumStock: 5 });

      await movementService.execute({
        inventoryId: INVENTORY_ID,
        movementType: "OUT",
        quantity: 10,
      });

      const stored = await inventoryRepository.findById(INVENTORY_ID);
      expect(stored?.minimumStock).toBe(5);
      expect(stored?.quantityOnHand).toBe(90);
      expect(stockMovementRepository.count()).toBe(1);
    });

    it("concurrent ADJUSTMENT movements preserve non-negative invariant", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 20, reservedQuantity: 0 }),
      ]);

      const results = await Promise.allSettled([
        inventoryRepository.applyAdjustment(INVENTORY_ID, -12),
        inventoryRepository.applyAdjustment(INVENTORY_ID, -12),
      ]);

      const successes = results.filter(
        (result) => result.status === "fulfilled" && result.value !== null,
      );
      expect(successes).toHaveLength(1);

      const stored = await inventoryRepository.findById(INVENTORY_ID);
      expect(stored?.quantityOnHand).toBe(8);
    });
  });

  describe("UpdateInventoryService transaction integrity", () => {
    it("rolls back metadata update when audit logging fails", async () => {
      const repository = new InMemoryInventoryRepository();
      repository.seed([buildInventoryEntity()]);
      const auditLogger = new MockAuditLogger();
      auditLogger.log = vi.fn(async () => {
        throw new Error("audit failed");
      });
      const service = new UpdateInventoryService(
        createRollbackTransactionRunner(repository, auditLogger),
      );

      await expect(
        service.execute({ id: INVENTORY_ID }, { minimumStock: 99 }),
      ).rejects.toThrow("audit failed");

      expect((await repository.findById(INVENTORY_ID))?.minimumStock).toBe(5);
    });
  });
});
