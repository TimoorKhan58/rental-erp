import { describe, expect, it } from "vitest";

import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import { UpdateDispatchService } from "@/modules/dispatch/application/services/update-dispatch.service";
import type { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import type { DispatchId } from "@/shared/domain/ids";
import {
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  DISPATCH_ID,
  buildCompletedDispatchEntity,
  buildDispatchEntity,
  buildReadyDispatchEntity,
  buildReservedRentalOrderEntity,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger } from "@/modules/dispatch/tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "@/modules/dispatch/tests/helpers/transaction-test-runner";

class GatedDispatchRepository
  extends InMemoryDispatchRepository
  implements IDispatchRepository
{
  private beforeMarkReadyClaimHook: (() => Promise<void>) | null = null;

  setBeforeMarkReadyClaimHook(hook: () => Promise<void>): void {
    this.beforeMarkReadyClaimHook = hook;
  }

  override async claimStatusTransition(
    id: DispatchId,
    expected: Dispatch["status"] | ReadonlyArray<Dispatch["status"]>,
    next: Dispatch["status"],
    timestamps?: {
      readyAt?: Date | null;
      dispatchedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<Dispatch | null> {
    const expectedList = Array.isArray(expected) ? expected : [expected];
    if (
      this.beforeMarkReadyClaimHook !== null &&
      next === "READY" &&
      expectedList.includes("DRAFT")
    ) {
      const hook = this.beforeMarkReadyClaimHook;
      this.beforeMarkReadyClaimHook = null;
      await hook();
    }

    return super.claimStatusTransition(id, expected, next, timestamps);
  }
}

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
}

function buildUpdateDispatchScope(
  dispatchRepository: InMemoryDispatchRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);

  return new UpdateDispatchService(
    createPassThroughTransactionRunner({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      externalRentalRepository: new InMemoryExternalRentalRepository(),
      auditLogger,
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    }),
  );
}

function buildDispatchCompleteScope(
  dispatchRepository: InMemoryDispatchRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
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
  const externalRentalRepository = new InMemoryExternalRentalRepository();

  return {
    stockMovementRepository,
    completeService: new CompleteDispatchService(
      createPassThroughTransactionRunner({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository,
        auditLogger,
        ...mockNotificationWriteScopeDeps,
        userId: USER_ID,
      }),
    ),
  };
}

describe("Phase 42 N-42-01: dispatch mark-ready concurrency", () => {
  describe("T42.1 markReady ∥ complete", () => {
    it("complete wins when markReady holds stale DRAFT read; markReady surfaces 409", async () => {
      const dispatchRepository = new GatedDispatchRepository();
      dispatchRepository.seed([buildDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const updateService = buildUpdateDispatchScope(dispatchRepository, auditLogger);
      const { completeService, stockMovementRepository } =
        buildDispatchCompleteScope(dispatchRepository, auditLogger);

      dispatchRepository.setBeforeMarkReadyClaimHook(async () => {
        await updateService.execute({ id: DISPATCH_ID }, { markReady: true });
        await completeService.execute({ id: DISPATCH_ID });
      });

      const results = await Promise.allSettled([
        updateService.execute({ id: DISPATCH_ID }, { markReady: true }),
      ]);

      expect(results[0]?.status).toBe("rejected");
      expect((results[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });

    it("never leaves committed stock effects with READY status under concurrent markReady+complete", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const updateService = buildUpdateDispatchScope(dispatchRepository, auditLogger);
      const { completeService, stockMovementRepository } =
        buildDispatchCompleteScope(dispatchRepository, auditLogger);

      await Promise.allSettled([
        updateService.execute({ id: DISPATCH_ID }, { markReady: true }),
        completeService.execute({ id: DISPATCH_ID }),
      ]);

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      const movementCount = stockMovementRepository.count();

      if (stored?.status === "READY") {
        expect(movementCount).toBe(0);
      } else {
        expect(stored?.status).toBe("COMPLETED");
        expect(movementCount).toBe(2);
      }
    });
  });

  describe("T42.2 complete ∥ markReady alternate interleaving", () => {
    it("complete-first scheduling rejects stale markReady on completed dispatch", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const updateService = buildUpdateDispatchScope(dispatchRepository, auditLogger);
      const { completeService, stockMovementRepository } =
        buildDispatchCompleteScope(dispatchRepository, auditLogger);

      await completeService.execute({ id: DISPATCH_ID });

      await expect(
        updateService.execute({ id: DISPATCH_ID }, { markReady: true }),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });
  });

  describe("T42.3 markReady ∥ markReady", () => {
    it("one markReady succeeds and the other surfaces 409", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const updateService = buildUpdateDispatchScope(dispatchRepository, auditLogger);

      const results = await Promise.allSettled([
        updateService.execute({ id: DISPATCH_ID }, { markReady: true }),
        updateService.execute({ id: DISPATCH_ID }, { markReady: true }),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("READY");
      expect(auditLogger.entries).toHaveLength(1);
    });
  });

  describe("T42.4 markReady against already-completed dispatch", () => {
    it("rejects markReady and leaves COMPLETED unchanged with no audit", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildCompletedDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const updateService = buildUpdateDispatchScope(dispatchRepository, auditLogger);

      await expect(
        updateService.execute({ id: DISPATCH_ID }, { markReady: true }),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(auditLogger.entries).toHaveLength(0);
    });
  });

  describe("T42.5 rollback after successful claim", () => {
    it("failed audit rolls back successful markReady claim", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildDispatchEntity()]);
      const auditLogger = new ThrowingAuditLogger();
      const updateService = new UpdateDispatchService(
        createRollbackTransactionRunner(
          dispatchRepository,
          new InMemoryRentalOrderRepository(),
          new InMemoryInventoryRepository(),
          new InMemoryStockMovementRepository(),
          auditLogger,
          USER_ID,
        ),
      );

      await expect(
        updateService.execute({ id: DISPATCH_ID }, { markReady: true }),
      ).rejects.toThrow("Audit failure");

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("DRAFT");
      expect(auditLogger.entries).toHaveLength(0);
    });
  });
});
