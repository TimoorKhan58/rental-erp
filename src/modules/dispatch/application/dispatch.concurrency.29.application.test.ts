import { describe, expect, it } from "vitest";

import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
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
import { ConcurrentUpdateError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  DISPATCH_ID,
  buildReadyDispatchEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "../tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

/**
 * Phase 29 (F-04) CompleteDispatch concurrency verification.
 *
 * The service atomically claims READY → DISPATCHED via
 * `dispatchRepository.claimStatusTransition` BEFORE any side effect
 * (OUT movement, external counter, RO ON_RENT flip, audit,
 * notifications). Losers surface ConcurrentUpdateError (HTTP 409).
 */

function buildService() {
  const dispatchRepository = new InMemoryDispatchRepository();
  dispatchRepository.seed([buildReadyDispatchEntity()]);
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
  const auditLogger = new MockAuditLogger();

  const service = new CompleteDispatchService(
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
  );

  return {
    service,
    dispatchRepository,
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    auditLogger,
  };
}

describe("Phase 29 F-04: complete-dispatch concurrency (T29.2)", () => {
  it("only one of two concurrent completions succeeds; side effects apply once", async () => {
    const {
      service,
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      auditLogger,
    } = buildService();

    const results = await Promise.allSettled([
      service.execute({ id: DISPATCH_ID }),
      service.execute({ id: DISPATCH_ID }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await dispatchRepository.findById(DISPATCH_ID);
    expect(stored?.status).toBe("COMPLETED");

    // Exactly one OUT + one RELEASE — the loser skipped all side effects.
    expect(stockMovementRepository.count()).toBe(2);

    const inv = await inventoryRepository.findById(INVENTORY_ID);
    expect(inv?.quantityOnHand).toBe(45);
    expect(inv?.reservedQuantity).toBe(0);

    const order = await rentalOrderRepository.findById(stored!.rentalOrderId);
    expect(order?.status).toBe("ON_RENT");

    // Exactly one dispatch-completion audit entry (stock-movement audits
    // are separate and covered by the movement count above).
    const dispatchAudits = auditLogger.entries.filter(
      (entry) => entry.entityName === "Dispatch",
    );
    expect(dispatchAudits.length).toBe(1);
  });
});
