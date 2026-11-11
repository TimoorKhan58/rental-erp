import { describe, expect, it } from "vitest";

import { buildCompletedDispatchEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
import { InspectReturnService } from "@/modules/return/application/services/inspect-return.service";
import { ReceiveReturnService } from "@/modules/return/application/services/receive-return.service";
import type { IReturnRepository } from "@/modules/return/domain/return.repository.interface";
import type { Return } from "@/modules/return/domain/return.entity";
import type { UpdateReturnStatusData } from "@/modules/return/domain/return.types";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import type { ReturnInspectionId } from "@/shared/domain/ids";
import {
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  ITEM_ID,
  RETURN_ID,
  buildInspectedReturnEntity,
  buildReceivedReturnEntity,
  buildReservedRentalOrderEntity,
  buildReturnEntity,
} from "@/modules/return/tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { MockAuditLogger } from "@/modules/return/tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "@/modules/return/tests/helpers/transaction-test-runner";

const VALID_INSPECT_INPUT = {
  items: [
    {
      rentalOrderItemId: ITEM_ID,
      goodQuantity: 3,
      damagedQuantity: 1,
      lostQuantity: 1,
      missingQuantity: 0,
    },
  ],
};

class GatedReturnRepository
  extends InMemoryReturnRepository
  implements IReturnRepository
{
  private beforeInspectClaimHook: (() => Promise<void>) | null = null;

  setBeforeInspectClaimHook(hook: () => Promise<void>): void {
    this.beforeInspectClaimHook = hook;
  }

  override async claimStatusTransition(
    id: ReturnInspectionId,
    expected: Return["status"] | ReadonlyArray<Return["status"]>,
    data: UpdateReturnStatusData,
  ): Promise<Return | null> {
    const expectedList = Array.isArray(expected) ? expected : [expected];
    if (
      this.beforeInspectClaimHook !== null &&
      data.status === "INSPECTED" &&
      expectedList.includes("RECEIVED")
    ) {
      const hook = this.beforeInspectClaimHook;
      this.beforeInspectClaimHook = null;
      await hook();
    }

    return super.claimStatusTransition(id, expected, data);
  }
}

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
}

function buildReturnWriteScope(
  returnRepository: InMemoryReturnRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  return createPassThroughTransactionRunner({
    returnRepository,
    dispatchRepository: new InMemoryDispatchRepository(),
    rentalOrderRepository: new InMemoryRentalOrderRepository(),
    inventoryRepository: new InMemoryInventoryRepository(),
    stockMovementRepository: new InMemoryStockMovementRepository(),
    externalRentalRepository: new InMemoryExternalRentalRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });
}

function buildReturnCompleteScope(
  returnRepository: InMemoryReturnRepository,
  auditLogger: MockAuditLogger = new MockAuditLogger(),
) {
  const dispatchRepository = new InMemoryDispatchRepository();
  dispatchRepository.seed([buildCompletedDispatchEntity()]);
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
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
      createPassThroughTransactionRunner({
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
    inspectService: new InspectReturnService(
      createPassThroughTransactionRunner({
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

describe("Phase 41 F-31-05: return receive/inspect concurrency", () => {
  describe("T41.1 inspect ∥ complete", () => {
    it("complete wins when inspect holds stale RECEIVED read; inspect surfaces 409", async () => {
      const returnRepository = new GatedReturnRepository();
      returnRepository.seed([buildReceivedReturnEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, inspectService, stockMovementRepository } =
        buildReturnCompleteScope(returnRepository, auditLogger);

      returnRepository.setBeforeInspectClaimHook(async () => {
        await inspectService.execute({ id: RETURN_ID }, VALID_INSPECT_INPUT);
        await completeService.execute({ id: RETURN_ID });
      });

      const results = await Promise.allSettled([
        inspectService.execute({ id: RETURN_ID }, VALID_INSPECT_INPUT),
      ]);

      expect(results[0]?.status).toBe("rejected");
      expect((results[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("COMPLETED");
      expect(stockMovementRepository.count()).toBe(2);
    });

    it("never leaves committed stock effects with INSPECTED status under concurrent inspect+complete", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildInspectedReturnEntity()]);
      const auditLogger = new MockAuditLogger();
      const { completeService, inspectService, stockMovementRepository } =
        buildReturnCompleteScope(returnRepository, auditLogger);

      await Promise.allSettled([
        inspectService.execute({ id: RETURN_ID }, VALID_INSPECT_INPUT),
        completeService.execute({ id: RETURN_ID }),
      ]);

      const stored = await returnRepository.findById(RETURN_ID);
      const movementCount = stockMovementRepository.count();

      if (stored?.status === "INSPECTED") {
        expect(movementCount).toBe(0);
      } else {
        expect(stored?.status).toBe("COMPLETED");
        expect(movementCount).toBe(2);
      }
    });
  });

  describe("T41.2 receive ∥ inspect", () => {
    it("concurrent receive and inspect on DRAFT yields RECEIVED without illegal inspect claim", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildReturnEntity()]);
      const auditLogger = new MockAuditLogger();
      const scope = buildReturnWriteScope(returnRepository, auditLogger);
      const receiveService = new ReceiveReturnService(scope);
      const inspectService = new InspectReturnService(scope);

      const results = await Promise.allSettled([
        receiveService.execute({ id: RETURN_ID }),
        inspectService.execute({ id: RETURN_ID }, VALID_INSPECT_INPUT),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        UnprocessableError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("RECEIVED");
    });
  });

  describe("T41.3 receive duplicate concurrency", () => {
    it("one receive succeeds and the other surfaces 409", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildReturnEntity()]);
      const receiveService = new ReceiveReturnService(
        buildReturnWriteScope(returnRepository),
      );

      const results = await Promise.allSettled([
        receiveService.execute({ id: RETURN_ID }),
        receiveService.execute({ id: RETURN_ID }),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("RECEIVED");
    });
  });

  describe("T41.4 inspect duplicate concurrency", () => {
    it("one inspect succeeds and the other surfaces 409", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildReceivedReturnEntity()]);
      const inspectService = new InspectReturnService(
        buildReturnWriteScope(returnRepository),
      );

      const results = await Promise.allSettled([
        inspectService.execute({ id: RETURN_ID }, VALID_INSPECT_INPUT),
        inspectService.execute({ id: RETURN_ID }, VALID_INSPECT_INPUT),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConcurrentUpdateError,
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("INSPECTED");
    });
  });

  describe("T41.5 audit rollback", () => {
    it("receive: failed audit rolls back successful receive claim", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildReturnEntity()]);
      const auditLogger = new ThrowingAuditLogger();
      const receiveService = new ReceiveReturnService(
        createRollbackTransactionRunner(
          returnRepository,
          new InMemoryDispatchRepository(),
          new InMemoryRentalOrderRepository(),
          new InMemoryInventoryRepository(),
          new InMemoryStockMovementRepository(),
          auditLogger,
          USER_ID,
        ),
      );

      await expect(receiveService.execute({ id: RETURN_ID })).rejects.toThrow(
        "Audit failure",
      );

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("DRAFT");
      expect(auditLogger.entries).toHaveLength(0);
    });

    it("inspect: failed audit rolls back successful inspect claim", async () => {
      const returnRepository = new InMemoryReturnRepository();
      returnRepository.seed([buildReceivedReturnEntity()]);
      const auditLogger = new ThrowingAuditLogger();
      const inspectService = new InspectReturnService(
        createRollbackTransactionRunner(
          returnRepository,
          new InMemoryDispatchRepository(),
          new InMemoryRentalOrderRepository(),
          new InMemoryInventoryRepository(),
          new InMemoryStockMovementRepository(),
          auditLogger,
          USER_ID,
        ),
      );

      await expect(
        inspectService.execute({ id: RETURN_ID }, VALID_INSPECT_INPUT),
      ).rejects.toThrow("Audit failure");

      const stored = await returnRepository.findById(RETURN_ID);
      expect(stored?.status).toBe("RECEIVED");
      expect(auditLogger.entries).toHaveLength(0);
    });
  });
});
