import { describe, expect, it } from "vitest";

import {
  buildDispatchEntity,
  DISPATCH_ID,
  ITEM_ID,
  OTHER_DISPATCH_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import { Return } from "@/modules/return/domain/return.entity";
import { CreateReturnService } from "@/modules/return/application/services/create-return.service";
import { UpdateReturnService } from "@/modules/return/application/services/update-return.service";
import type { CreateReturnInput } from "@/modules/return/application/schemas/return.schemas";
import {
  OTHER_RETURN_ID,
  RETURN_ID,
  USER_ID,
  buildReturnEntity,
  buildReservedRentalOrderEntity,
} from "@/modules/return/tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type { DispatchId, ProductId, ReturnInspectionId } from "@/shared/domain/ids";

import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

class ThrowingAuditLogger extends MockAuditLogger {
  async log(): Promise<void> {
    throw new Error("Audit failure");
  }
}

function buildReturnLineItem(quantity: number) {
  return {
    id: ITEM_ID,
    rentalOrderItemId: ITEM_ID,
    dispatchItemId: ITEM_ID,
    returnedQuantity: quantity,
    ownedQuantity: null,
    externalQuantity: null,
    goodQuantity: 0,
    damagedQuantity: 0,
    lostQuantity: 0,
    missingQuantity: 0,
    ownedGoodQuantity: 0,
    ownedDamagedQuantity: 0,
    ownedLostQuantity: 0,
    externalGoodQuantity: 0,
    externalDamagedQuantity: 0,
    externalLostQuantity: 0,
    notes: null,
  };
}

function buildDispatchWithQuantity(quantity: number, dispatchId = DISPATCH_ID) {
  const readyAt = new Date("2026-01-16T10:00:00.000Z");
  const dispatchedAt = new Date("2026-01-17T10:00:00.000Z");
  const completedAt = new Date("2026-01-18T10:00:00.000Z");

  return buildDispatchEntity({
    id: dispatchId,
    status: "COMPLETED",
    readyAt,
    dispatchedAt,
    completedAt,
    updatedAt: completedAt,
    items: [
      {
        id: ITEM_ID,
        productId: PRODUCT_ID as ProductId,
        rentalOrderItemId: ITEM_ID,
        quantity,
        ownedQuantity: null,
        externalQuantity: null,
        notes: null,
      },
    ],
  });
}

function createReturnInput(
  quantity: number,
  returnNumber: string,
  dispatchId: DispatchId = DISPATCH_ID,
): CreateReturnInput {
  return {
    returnNumber,
    rentalOrderId: RENTAL_ORDER_ID,
    dispatchId,
    returnDate: "2026-02-10T00:00:00.000Z",
    remarks: "Concurrent return test",
    items: [
      {
        rentalOrderItemId: ITEM_ID,
        dispatchItemId: ITEM_ID,
        quantity,
      },
    ],
  };
}

function buildReturnWithQuantity(
  id: ReturnInspectionId,
  quantity: number,
  returnNumber: string,
  dispatchId: DispatchId = DISPATCH_ID,
) {
  const base = buildReturnEntity({ id, status: "DRAFT" });
  const props = base.toProps();

  return Return.reconstitute({
    ...props,
    returnNumber,
    dispatchId,
    items: [buildReturnLineItem(quantity)],
  });
}

async function sumReturnedForDispatch(
  returnRepository: InMemoryReturnRepository,
  dispatchId: DispatchId,
): Promise<number> {
  const returns = await returnRepository.findByDispatchId(dispatchId);
  let total = 0;

  for (const returnRecord of returns) {
    if (returnRecord.status === "CANCELLED") {
      continue;
    }

    for (const item of returnRecord.items) {
      total += item.returnedQuantity;
    }
  }

  return total;
}

function buildCreateReturnService(deps: {
  returnRepository: InMemoryReturnRepository;
  dispatchRepository: InMemoryDispatchRepository;
  rentalOrderRepository: InMemoryRentalOrderRepository;
  auditLogger?: MockAuditLogger;
  transactionRunner?: ReturnType<typeof createPassThroughTransactionRunner>;
}) {
  const auditLogger = deps.auditLogger ?? new MockAuditLogger();

  return new CreateReturnService(
    deps.transactionRunner ??
      createPassThroughTransactionRunner({
        returnRepository: deps.returnRepository,
        dispatchRepository: deps.dispatchRepository,
        rentalOrderRepository: deps.rentalOrderRepository,
        inventoryRepository: new InMemoryInventoryRepository(),
        stockMovementRepository: new InMemoryStockMovementRepository(),
        externalRentalRepository: new InMemoryExternalRentalRepository(),
        auditLogger,
        ...mockNotificationWriteScopeDeps,
        userId: USER_ID,
      }),
    createMockNumberSequenceRepository(),
  );
}

function buildUpdateReturnService(deps: {
  returnRepository: InMemoryReturnRepository;
  dispatchRepository: InMemoryDispatchRepository;
  rentalOrderRepository: InMemoryRentalOrderRepository;
  auditLogger?: MockAuditLogger;
}) {
  const auditLogger = deps.auditLogger ?? new MockAuditLogger();

  return new UpdateReturnService(
    createPassThroughTransactionRunner({
      returnRepository: deps.returnRepository,
      dispatchRepository: deps.dispatchRepository,
      rentalOrderRepository: deps.rentalOrderRepository,
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      externalRentalRepository: new InMemoryExternalRentalRepository(),
      auditLogger,
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    }),
  );
}

describe("Phase 45 N-44-01: return capacity concurrency", () => {
  it("T45.1: concurrent create over-capacity allows exactly one winner", async () => {
    const returnRepository = new InMemoryReturnRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchWithQuantity(10)]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = buildCreateReturnService({
      returnRepository,
      dispatchRepository,
      rentalOrderRepository,
    });

    const results = await Promise.allSettled([
      service.execute(createReturnInput(6, "RTN-RACE-A")),
      service.execute(createReturnInput(5, "RTN-RACE-B")),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      UnprocessableError,
    );

    expect(await sumReturnedForDispatch(returnRepository, DISPATCH_ID)).toBeLessThanOrEqual(
      10,
    );
    expect(returnRepository.count()).toBe(1);
  });

  it("T45.2: concurrent create exact capacity both succeed", async () => {
    const returnRepository = new InMemoryReturnRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchWithQuantity(10)]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = buildCreateReturnService({
      returnRepository,
      dispatchRepository,
      rentalOrderRepository,
    });

    const results = await Promise.allSettled([
      service.execute(createReturnInput(5, "RTN-EXACT-A")),
      service.execute(createReturnInput(5, "RTN-EXACT-B")),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    expect(await sumReturnedForDispatch(returnRepository, DISPATCH_ID)).toBe(10);
    expect(returnRepository.count()).toBe(2);
  });

  it("T45.3: existing returns plus concurrent create preserve capacity", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildReturnWithQuantity(RETURN_ID, 6, "RTN-EXISTING"),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchWithQuantity(10)]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = buildCreateReturnService({
      returnRepository,
      dispatchRepository,
      rentalOrderRepository,
    });

    const results = await Promise.allSettled([
      service.execute(createReturnInput(4, "RTN-REM-A")),
      service.execute(createReturnInput(2, "RTN-REM-B")),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await sumReturnedForDispatch(returnRepository, DISPATCH_ID)).toBeLessThanOrEqual(
      10,
    );
    expect(await sumReturnedForDispatch(returnRepository, DISPATCH_ID)).toBe(10);
  });

  it("T45.4: concurrent update over-capacity rejects at least one", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildReturnWithQuantity(RETURN_ID, 4, "RTN-A"),
      buildReturnWithQuantity(OTHER_RETURN_ID, 3, "RTN-B"),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchWithQuantity(10)]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = buildUpdateReturnService({
      returnRepository,
      dispatchRepository,
      rentalOrderRepository,
    });

    const results = await Promise.allSettled([
      service.execute(
        { id: RETURN_ID },
        {
          items: [
            {
              rentalOrderItemId: ITEM_ID,
              dispatchItemId: ITEM_ID,
              quantity: 7,
            },
          ],
        },
      ),
      service.execute(
        { id: OTHER_RETURN_ID },
        {
          items: [
            {
              rentalOrderItemId: ITEM_ID,
              dispatchItemId: ITEM_ID,
              quantity: 4,
            },
          ],
        },
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      UnprocessableError,
    );
    expect(await sumReturnedForDispatch(returnRepository, DISPATCH_ID)).toBeLessThanOrEqual(
      10,
    );
  });

  it("T45.5: update excludes current return from prior-return total", async () => {
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildReturnWithQuantity(RETURN_ID, 4, "RTN-A"),
      buildReturnWithQuantity(OTHER_RETURN_ID, 3, "RTN-B"),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchWithQuantity(10)]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = buildUpdateReturnService({
      returnRepository,
      dispatchRepository,
      rentalOrderRepository,
    });

    await service.execute(
      { id: RETURN_ID },
      {
        items: [
          {
            rentalOrderItemId: ITEM_ID,
            dispatchItemId: ITEM_ID,
            quantity: 7,
          },
        ],
      },
    );

    expect(await sumReturnedForDispatch(returnRepository, DISPATCH_ID)).toBe(10);

    const updated = await returnRepository.findById(RETURN_ID);
    expect(updated?.items[0]?.returnedQuantity).toBe(7);
  });

  it("T45.6: unrelated dispatches do not serialize each other", async () => {
    const returnRepository = new InMemoryReturnRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildDispatchWithQuantity(10, DISPATCH_ID),
      buildDispatchWithQuantity(10, OTHER_DISPATCH_ID),
    ]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const service = buildCreateReturnService({
      returnRepository,
      dispatchRepository,
      rentalOrderRepository,
    });

    const results = await Promise.allSettled([
      service.execute(createReturnInput(5, "RTN-DISP-A", DISPATCH_ID)),
      service.execute(createReturnInput(5, "RTN-DISP-B", OTHER_DISPATCH_ID)),
    ]);

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    expect(await sumReturnedForDispatch(returnRepository, DISPATCH_ID)).toBe(5);
    expect(await sumReturnedForDispatch(returnRepository, OTHER_DISPATCH_ID)).toBe(5);
  });

  it("T45.7: audit failure rolls back return mutation", async () => {
    const returnRepository = new InMemoryReturnRepository();
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildDispatchWithQuantity(10)]);
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const auditLogger = new ThrowingAuditLogger();
    const service = buildCreateReturnService({
      returnRepository,
      dispatchRepository,
      rentalOrderRepository,
      auditLogger,
      transactionRunner: createRollbackTransactionRunner(
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        new InMemoryInventoryRepository(),
        new InMemoryStockMovementRepository(),
        auditLogger,
        USER_ID,
      ),
    });

    await expect(
      service.execute(createReturnInput(4, "RTN-ROLLBACK")),
    ).rejects.toThrow("Audit failure");

    expect(returnRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});
