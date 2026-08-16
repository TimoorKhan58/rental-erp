import { describe, expect, it } from "vitest";

import { ConfirmRentalOrderService } from "@/modules/rental-order/application/services/confirm-rental-order.service";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { USER_ID } from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { ConcurrentUpdateError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  RENTAL_ORDER_ID,
  buildRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

/**
 * Phase 29 (F-08) ConfirmRentalOrder concurrency verification.
 *
 * The service atomically claims DRAFT → CONFIRMED via
 * `rentalOrderRepository.claimStatusTransition`. Only one concurrent
 * confirmation succeeds; the loser surfaces ConcurrentUpdateError (HTTP 409).
 */

function buildService() {
  const rentalOrderRepository = new InMemoryRentalOrderRepository();
  rentalOrderRepository.seed([buildRentalOrderEntity()]);
  const auditLogger = new MockAuditLogger();

  const service = new ConfirmRentalOrderService(
    createPassThroughTransactionRunner({
      rentalOrderRepository,
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      dispatchRepository: new InMemoryDispatchRepository(),
      externalRentalRepository: new InMemoryExternalRentalRepository(),
      auditLogger,
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    }),
  );

  return { service, rentalOrderRepository, auditLogger };
}

describe("Phase 29 F-08: confirm rental order concurrency (T29.6)", () => {
  it("only one of two concurrent confirmations succeeds; audit entry appears once", async () => {
    const { service, rentalOrderRepository, auditLogger } = buildService();

    const results = await Promise.allSettled([
      service.execute({ id: RENTAL_ORDER_ID }),
      service.execute({ id: RENTAL_ORDER_ID }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentUpdateError,
    );

    const stored = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    expect(stored?.status).toBe("CONFIRMED");

    const confirmAudits = auditLogger.entries.filter(
      (entry) => entry.action === "APPROVE" || entry.action === "UPDATE",
    );
    expect(confirmAudits.length).toBe(1);
  });
});
