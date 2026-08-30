import { describe, expect, it } from "vitest";

import { CancelDispatchService } from "@/modules/dispatch/application/services/cancel-dispatch.service";
import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import type { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import { CancelReturnService } from "@/modules/return/application/services/cancel-return.service";
import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
import type { IReturnRepository } from "@/modules/return/domain/return.repository.interface";
import type { Return } from "@/modules/return/domain/return.entity";
import type { UpdateReturnStatusData } from "@/modules/return/domain/return.types";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { buildCompletedDispatchEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
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
import type { DispatchId, ReturnInspectionId } from "@/shared/domain/ids";
import { ConcurrentUpdateError, UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  DISPATCH_ID,
  buildReadyDispatchEntity,
  buildReservedRentalOrderEntity,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger } from "@/modules/dispatch/tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner as createDispatchPassThroughRunner,
  createRollbackTransactionRunner as createDispatchRollbackRunner,
} from "@/modules/dispatch/tests/helpers/transaction-test-runner";
import {
  RETURN_ID,
  buildInspectedReturnEntity,
  buildReservedRentalOrderEntity as buildReturnOrderEntity,
} from "@/modules/return/tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import {
  createPassThroughTransactionRunner as createReturnPassThroughRunner,
  createRollbackTransactionRunner as createReturnRollbackRunner,
} from "@/modules/return/tests/helpers/transaction-test-runner";

class GatedDispatchRepository
  extends InMemoryDispatchRepository
  implements IDispatchRepository
{
  private beforeCancelClaimHook: (() => Promise<void>) | null = null;

  setBeforeCancelClaimHook(hook: () => Promise<void>): void {
    this.beforeCancelClaimHook = hook;
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
      this.beforeCancelClaimHook !== null &&
      next === "CANCELLED" &&
      expectedList.some((status) => status === "DRAFT" || status === "READY")
    ) {
      await this.beforeCancelClaimHook();
      this.beforeCancelClaimHook = null;
    }

    return super.claimStatusTransition(id, expected, next, timestamps);
  }
}

class GatedReturnRepository
  extends InMemoryReturnRepository
  implements IReturnRepository
{
  private beforeCancelClaimHook: (() => Promise<void>) | null = null;

  setBeforeCancelClaimHook(hook: () => Promise<void>): void {
    this.beforeCancelClaimHook = hook;
  }

  override async claimStatusTransition(
    id: ReturnInspectionId,
    expected: Return["status"] | ReadonlyArray<Return["status"]>,
    data: UpdateReturnStatusData,
  ): Promise<Return | null> {
    const expectedList = Array.isArray(expected) ? expected : [expected];
    if (
      this.beforeCancelClaimHook !== null &&
      data.status === "CANCELLED" &&
      expectedList.some(
        (status) =>
          status === "DRAFT" || status === "RECEIVED" || status === "INSPECTED",
      )
    ) {
      await this.beforeCancelClaimHook();
      this.beforeCancelClaimHook = null;
    }

    return super.claimStatusTransition(id, expected, data);
  }
}

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
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
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    externalRentalRepository,
    auditLogger,
    completeService: new CompleteDispatchService(
      createDispatchPassThroughRunner({
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

function buildDispatchCancelScope(
  dispatchRepository: InMemoryDispatchRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  return new CancelDispatchService(
    createDispatchPassThroughRunner({
      dispatchRepository,
      rentalOrderRepository: new InMemoryRentalOrderRepository(),
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      auditLogger,
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    }),
  );
}

function buildReturnCompleteScope(
  returnRepository: InMemoryReturnRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  const dispatchRepository = new InMemoryDispatchRepository();
  dispatchRepository.seed([buildCompletedDispatchEntity()]);
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  rentalOrderRepository.seed([buildReturnOrderEntity()]);
  const inventoryRepository = new InMemoryInventoryRepository();
  inventoryRepository.seed([
    buildInventoryEntity({
      id: INVENTORY_ID,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 45,
      reservedQuantity: 5,
    }),
  ]);
  const stockMovementRepository = new InMemoryStockMovementRepository();
  const externalRentalRepository = new InMemoryExternalRentalRepository();

  return {
    dispatchRepository,
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    externalRentalRepository,
    auditLogger,
    completeService: new CompleteReturnService(
      createReturnPassThroughRunner({
        returnRepository,
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

function buildReturnCancelScope(
  returnRepository: InMemoryReturnRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  return new CancelReturnService(
    createReturnPassThroughRunner({
      returnRepository,
      dispatchRepository: new InMemoryDispatchRepository(),
      rentalOrderRepository: new InMemoryRentalOrderRepository(),
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      externalRentalRepository: new InMemoryExternalRentalRepository(),
      auditLogger,
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    }),
  );
}

describe("Phase 40 N-40-01: cancel workflow concurrency", () => {
  describe("T40.1 dispatch cancel ∥ complete", () => {
    it("complete wins when cancel holds stale READY read; cancel surfaces 409", async () => {
      const dispatchRepository = new GatedDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildDispatchCompleteScope(dispatchRepository, auditLogger);
      const cancelService = buildDispatchCancelScope(
        dispatchRepository,
        auditLogger,
      );

      dispatchRepository.setBeforeCancelClaimHook(async () => {
        await completeService.execute({ id: DISPATCH_ID });
      });

      const results = await Promise.allSettled([
        cancelService.execute({ id: DISPATCH_ID }),
      ]);

      expect(results[0]?.status).toBe("rejected");
      expect((results[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });

    it("never leaves stock effects with CANCELLED status under concurrent cancel+complete", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildDispatchCompleteScope(dispatchRepository, auditLogger);
      const cancelService = buildDispatchCancelScope(
        dispatchRepository,
        auditLogger,
      );

      await Promise.allSettled([
        cancelService.execute({ id: DISPATCH_ID }),
        completeService.execute({ id: DISPATCH_ID }),
      ]);

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      const movementCount = stockMovementRepository.count();

      if (stored?.status === "CANCELLED") {
        expect(movementCount).toBe(0);
      } else {
        expect(stored?.status).toBe("COMPLETED");
        expect(movementCount).toBe(2);
      }
    });
  });

  describe("T40.2 return cancel ∥ complete", () => {
    it("complete wins when cancel holds stale INSPECTED read; cancel surfaces 409", async () => {
      const returnRepository = new GatedReturnRepository();
      returnRepository.seed([buildInspectedReturnEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildReturnCompleteScope(returnRepository, auditLogger);
      const cancelService = buildReturnCancelScope(returnRepository, auditLogger);

      returnRepository.setBeforeCancelClaimHook(async () => {
        await completeService.execute({ id: RETURN_ID });
      });

      const results = await Promise.allSettled([
        cancelService.execute({ id: RETURN_ID }),
      ]);

      expect(results[0]?.status).toBe("rejected");
      expect((results[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });

    it("never leaves stock effects with CANCELLED status under concurrent cancel+complete", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildInspectedReturnEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildReturnCompleteScope(returnRepository, auditLogger);
      const cancelService = buildReturnCancelScope(returnRepository, auditLogger);

      await Promise.allSettled([
        cancelService.execute({ id: RETURN_ID }),
        completeService.execute({ id: RETURN_ID }),
      ]);

      const stored = await returnRepository.findById(RETURN_ID);
      const movementCount = stockMovementRepository.count();

      if (stored?.status === "CANCELLED") {
        expect(movementCount).toBe(0);
      } else {
        expect(stored?.status).toBe("COMPLETED");
        expect(movementCount).toBe(2);
      }
    });
  });

  describe("T40.3 cancel ∥ cancel", () => {
    it("dispatch: one cancel succeeds and the other surfaces 409", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const cancelService = buildDispatchCancelScope(dispatchRepository);

      const results = await Promise.allSettled([
        cancelService.execute({ id: DISPATCH_ID }),
        cancelService.execute({ id: DISPATCH_ID }),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("CANCELLED");
    });

    it("return: one cancel succeeds and the other surfaces 409", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildInspectedReturnEntity()]);
      const cancelService = buildReturnCancelScope(returnRepository);

      const results = await Promise.allSettled([
        cancelService.execute({ id: RETURN_ID }),
        cancelService.execute({ id: RETURN_ID }),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("CANCELLED");
    });
  });

  describe("T40.4 opposite scheduling", () => {
    it("dispatch: cancel-first interleaving cannot overwrite successful complete", async () => {
      const dispatchRepository = new GatedDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildDispatchCompleteScope(dispatchRepository, auditLogger);
      const cancelService = buildDispatchCancelScope(
        dispatchRepository,
        auditLogger,
      );

      dispatchRepository.setBeforeCancelClaimHook(async () => {
        await completeService.execute({ id: DISPATCH_ID });
      });

      await expect(cancelService.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });

    it("dispatch: complete-first scheduling rejects stale cancel", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildDispatchCompleteScope(dispatchRepository, auditLogger);
      const cancelService = buildDispatchCancelScope(
        dispatchRepository,
        auditLogger,
      );

      await completeService.execute({ id: DISPATCH_ID });

      await expect(cancelService.execute({ id: DISPATCH_ID })).rejects.toBeInstanceOf(
        UnprocessableError,
      );

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });

    it("return: cancel-first interleaving cannot overwrite successful complete", async () => {
      const returnRepository = new GatedReturnRepository();
      returnRepository.seed([buildInspectedReturnEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildReturnCompleteScope(returnRepository, auditLogger);
      const cancelService = buildReturnCancelScope(returnRepository, auditLogger);

      returnRepository.setBeforeCancelClaimHook(async () => {
        await completeService.execute({ id: RETURN_ID });
      });

      await expect(cancelService.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });

    it("return: complete-first scheduling rejects stale cancel", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildInspectedReturnEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, stockMovementRepository } =
        buildReturnCompleteScope(returnRepository, auditLogger);
      const cancelService = buildReturnCancelScope(returnRepository, auditLogger);

      await completeService.execute({ id: RETURN_ID });

      await expect(cancelService.execute({ id: RETURN_ID })).rejects.toBeInstanceOf(
        UnprocessableError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });
  });

  describe("T40.5 cancel side-effect rollback", () => {
    it("dispatch: failed audit rolls back successful cancel claim", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([buildReadyDispatchEntity()]);
      const auditLogger = new ThrowingAuditLogger();
      const cancelService = new CancelDispatchService(
        createDispatchRollbackRunner(
          dispatchRepository,
          new InMemoryRentalOrderRepository(),
          new InMemoryInventoryRepository(),
          new InMemoryStockMovementRepository(),
          auditLogger,
          USER_ID,
        ),
      );

      await expect(cancelService.execute({ id: DISPATCH_ID })).rejects.toThrow(
        "Audit failure",
      );

      const stored = await dispatchRepository.findById(DISPATCH_ID);
      expect(stored?.status).toBe("READY");
      expect(auditLogger.entries).toHaveLength(0);
    });

    it("return: failed audit rolls back successful cancel claim", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildInspectedReturnEntity()]);
      const auditLogger = new ThrowingAuditLogger();
      const cancelService = new CancelReturnService(
        createReturnRollbackRunner(
          returnRepository,
          new InMemoryDispatchRepository(),
          new InMemoryRentalOrderRepository(),
          new InMemoryInventoryRepository(),
          new InMemoryStockMovementRepository(),
          auditLogger,
          USER_ID,
        ),
      );

      await expect(cancelService.execute({ id: RETURN_ID })).rejects.toThrow(
        "Audit failure",
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("INSPECTED");
      expect(auditLogger.entries).toHaveLength(0);
    });
  });
});
