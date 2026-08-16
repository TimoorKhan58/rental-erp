import { describe, expect, it } from "vitest";

import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { buildCompletedDispatchEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
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
  RETURN_ID,
  buildInspectedReturnEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "../tests/helpers/in-memory-return.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

/**
 * Phase 29 (F-01) CompleteReturn concurrency verification.
 *
 * The service now atomically claims INSPECTED → COMPLETED via
 * `returnRepository.claimStatusTransition` BEFORE any side effect
 * (RELEASE, IN, external custody, audit, notifications). Under
 * contention the loser sees zero rows updated and surfaces a
 * ConcurrentUpdateError (HTTP 409).
 */

function buildService() {
  const returnRepository = new InMemoryReturnRepository();
  returnRepository.seed([buildInspectedReturnEntity()]);
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
  const auditLogger = new MockAuditLogger();

  const service = new CompleteReturnService(
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
  );

  return {
    service,
    returnRepository,
    stockMovementRepository,
    inventoryRepository,
    auditLogger,
  };
}

describe("Phase 29 F-01: complete-return concurrency (T29.1)", () => {
  it("only one of two concurrent completions succeeds; side effects apply once", async () => {
    const {
      service,
      returnRepository,
      stockMovementRepository,
      inventoryRepository,
      auditLogger,
    } = buildService();

    const results = await Promise.allSettled([
      service.execute({ id: RETURN_ID }),
      service.execute({ id: RETURN_ID }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await returnRepository.findById(RETURN_ID);
    expect(stored?.status).toBe("COMPLETED");

    // Exactly one RELEASE + one IN — the loser skipped all side effects.
    expect(stockMovementRepository.count()).toBe(2);

    const inv = await inventoryRepository.findById(INVENTORY_ID);
    expect(inv?.quantityOnHand).toBe(48);
    expect(inv?.reservedQuantity).toBe(0);

    // Exactly one return-completion UPDATE audit entry (per-item RETURN
    // audits for lost quantities and stock-movement audits are separate).
    const returnCompleteAudits = auditLogger.entries.filter(
      (entry) => entry.entityName === "Return" && entry.action === "UPDATE",
    );
    expect(returnCompleteAudits.length).toBe(1);
  });
});
