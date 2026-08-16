import { describe, expect, it } from "vitest";

import { CancelDispatchService } from "@/modules/dispatch/application/services/cancel-dispatch.service";
import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import { CreateDispatchService } from "@/modules/dispatch/application/services/create-dispatch.service";
import type { CreateDispatchInput } from "@/modules/dispatch/application/schemas/dispatch.schemas";
import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { syncRentalOrderStatusFromReturns } from "@/modules/rental-order/application/services/sync-rental-order-status-from-returns";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { createPassThroughTransactionRunner as createRentalOrderPassThroughRunner } from "@/modules/rental-order/tests/helpers/transaction-test-runner";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import { Return } from "@/modules/return/domain/return.entity";
import {
  buildCreateReturnData,
} from "@/modules/return/tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { ConcurrentUpdateError, UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type { DispatchId, ProductId, RentalOrderId, ReturnInspectionId } from "@/shared/domain/ids";

import {
  DISPATCH_ID,
  ITEM_ID,
  RENTAL_ORDER_ID,
  buildDispatchEntity,
  buildReadyDispatchEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "../tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

function buildCreateService(deps: {
  dispatchRepository: InMemoryDispatchRepository;
  rentalOrderRepository: InMemoryRentalOrderRepository;
  inventoryRepository?: InMemoryInventoryRepository;
  stockMovementRepository?: InMemoryStockMovementRepository;
  auditLogger?: MockAuditLogger;
}) {
  const auditLogger = deps.auditLogger ?? new MockAuditLogger();

  return {
    service: new CreateDispatchService(
      createPassThroughTransactionRunner({
        dispatchRepository: deps.dispatchRepository,
        rentalOrderRepository: deps.rentalOrderRepository,
        inventoryRepository:
          deps.inventoryRepository ?? new InMemoryInventoryRepository(),
        stockMovementRepository:
          deps.stockMovementRepository ?? new InMemoryStockMovementRepository(),
        externalRentalRepository: new InMemoryExternalRentalRepository(),
        auditLogger,
        ...mockNotificationWriteScopeDeps,
        userId: USER_ID,
      }),
      createMockNumberSequenceRepository(),
    ),
    auditLogger,
  };
}

function createDispatchInput(
  quantity: number,
  dispatchNumber: string,
): CreateDispatchInput {
  return {
    dispatchNumber,
    rentalOrderId: RENTAL_ORDER_ID,
    dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
    deliveryMethod: "DELIVERY",
    deliveryAddress: "123 Event Venue Road, City Center",
    items: [
      {
        productId: PRODUCT_ID,
        rentalOrderItemId: ITEM_ID,
        quantity,
      },
    ],
  };
}

function dispatchIdFromIndex(index: number): DispatchId {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}` as DispatchId;
}

function buildBulkDraftDispatches(
  count: number,
  quantityPerDispatch: number,
  status: "DRAFT" | "CANCELLED" | "COMPLETED" = "DRAFT",
) {
  return Array.from({ length: count }, (_, index) =>
    buildDispatchEntity({
      id: dispatchIdFromIndex(index),
      status,
      items: [
        {
          id: `${index}-line`,
          productId: PRODUCT_ID as ProductId,
          rentalOrderItemId: ITEM_ID,
          quantity: quantityPerDispatch,
          ownedQuantity: null,
          externalQuantity: null,
          notes: null,
        },
      ],
    }),
  );
}

describe("Phase 30 dispatch claimed-quantity integrity", () => {
  describe("T30.1 concurrent dispatch over-claim", () => {
    it("allows exactly one create of full reserved capacity under race", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
      const { service } = buildCreateService({
        dispatchRepository,
        rentalOrderRepository,
      });

      const results = await Promise.allSettled([
        service.execute(createDispatchInput(10, "DSP-RACE-A")),
        service.execute(createDispatchInput(10, "DSP-RACE-B")),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        UnprocessableError,
      );

      expect(dispatchRepository.count()).toBe(1);

      const claimed =
        await dispatchRepository.sumClaimedSourceQuantitiesByRentalOrderId(
          RENTAL_ORDER_ID,
        );
      expect(claimed.owned.get(ITEM_ID)).toBe(10);
    });
  });

  describe("T30.2 concurrent partial claims", () => {
    it("allows only one of two concurrent partial claims when combined exceeds reserved", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
      const { service } = buildCreateService({
        dispatchRepository,
        rentalOrderRepository,
      });

      const results = await Promise.allSettled([
        service.execute(createDispatchInput(6, "DSP-PARTIAL-A")),
        service.execute(createDispatchInput(6, "DSP-PARTIAL-B")),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        UnprocessableError,
      );

      const claimed =
        await dispatchRepository.sumClaimedSourceQuantitiesByRentalOrderId(
          RENTAL_ORDER_ID,
        );
      expect(claimed.owned.get(ITEM_ID)).toBe(6);
    });
  });

  describe("T30.3 existing claim + race", () => {
    it("never exceeds reserved when two concurrent creates compete for remaining capacity", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([
        buildDispatchEntity({
          id: dispatchIdFromIndex(9000),
          status: "DRAFT",
          items: [
            {
              id: "existing-line",
              productId: PRODUCT_ID as ProductId,
              rentalOrderItemId: ITEM_ID,
              quantity: 7,
              ownedQuantity: null,
              externalQuantity: null,
              notes: null,
            },
          ],
        }),
      ]);
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
      const { service } = buildCreateService({
        dispatchRepository,
        rentalOrderRepository,
      });

      const results = await Promise.allSettled([
        service.execute(createDispatchInput(3, "DSP-REM-A")),
        service.execute(createDispatchInput(3, "DSP-REM-B")),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const claimed =
        await dispatchRepository.sumClaimedSourceQuantitiesByRentalOrderId(
          RENTAL_ORDER_ID,
        );
      expect(claimed.owned.get(ITEM_ID)).toBeLessThanOrEqual(10);
      expect(claimed.owned.get(ITEM_ID)).toBe(10);
    });
  });

  describe("T30.4 more than 100 dispatches — Rollup A aggregate", () => {
    it("rejects create that would over-claim when 101 prior dispatches exist", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed(buildBulkDraftDispatches(101, 1));
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildRentalOrderEntity({
          status: "RESERVED",
          reservedQuantity: 102,
          items: [
            {
              id: ITEM_ID,
              productId: PRODUCT_ID as ProductId,
              quantity: 102,
              dailyRate: 100,
              reservedQuantity: 102,
              startDate: new Date("2026-02-01T00:00:00.000Z"),
              endDate: new Date("2026-02-05T00:00:00.000Z"),
              numberOfDays: 4,
            },
          ],
        }),
      ]);
      const { service } = buildCreateService({
        dispatchRepository,
        rentalOrderRepository,
      });

      await expect(
        service.execute(createDispatchInput(2, "DSP-OVER-102")),
      ).rejects.toBeInstanceOf(UnprocessableError);

      expect(dispatchRepository.count()).toBe(101);
    });
  });

  describe("T30.5 rental order cancellation with >100 dispatches", () => {
    it("blocks cancel when active dispatch exists beyond the first 100 records", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      const cancelled = buildBulkDraftDispatches(100, 1, "CANCELLED");
      const active = buildDispatchEntity({
        id: dispatchIdFromIndex(5000),
        status: "READY",
      });
      dispatchRepository.seed([...cancelled, active]);

      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 50,
          reservedQuantity: 10,
        }),
      ]);

      const service = new CancelRentalOrderService(
        createRentalOrderPassThroughRunner({
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository: new InMemoryStockMovementRepository(),
          dispatchRepository,
          externalRentalRepository: new InMemoryExternalRentalRepository(),
          auditLogger: new MockAuditLogger(),
          ...mockNotificationWriteScopeDeps,
          userId: USER_ID,
        }),
      );

      await expect(service.execute({ id: RENTAL_ORDER_ID })).rejects.toBeInstanceOf(
        UnprocessableError,
      );
    });
  });

  describe("T30.6 return synchronization with >100 dispatches", () => {
    it("derives RO status from COMPLETED dispatch beyond a full page of DRAFT records", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      const draftDispatches = buildBulkDraftDispatches(100, 1, "DRAFT");
      const completedDispatch = buildDispatchEntity({
        id: dispatchIdFromIndex(6000),
        status: "COMPLETED",
        items: [
          {
            id: "completed-line",
            productId: PRODUCT_ID as ProductId,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
            ownedQuantity: null,
            externalQuantity: null,
            notes: null,
          },
        ],
      });
      dispatchRepository.seed([...draftDispatches, completedDispatch]);

      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildRentalOrderEntity({
          status: "ON_RENT",
          reservedQuantity: 10,
        }),
      ]);

      const returnRepository = new InMemoryReturnRepository();
      const returnId =
        "ee0e8400-e29b-41d4-a716-446655440010" as ReturnInspectionId;
      const createdReturn = Return.create(
        buildCreateReturnData({
          returnNumber: "RTN-COMPLETED-101",
          dispatchId: completedDispatch.id,
          items: [
            {
              rentalOrderItemId: ITEM_ID,
              dispatchItemId: "completed-line",
              quantity: 5,
            },
          ],
        }),
      );
      const now = new Date("2026-02-11T00:00:00.000Z");
      const completedReturn = Return.reconstitute({
        id: returnId,
        returnNumber: createdReturn.returnNumber,
        rentalOrderId: createdReturn.rentalOrderId,
        dispatchId: createdReturn.dispatchId,
        returnDate: createdReturn.returnDate,
        remarks: createdReturn.remarks,
        status: "COMPLETED",
        receivedAt: now,
        inspectedAt: now,
        completedAt: now,
        items: createdReturn.items.map((item) => ({
          ...item,
          id: `${returnId}-item`,
          returnedQuantity: 5,
          goodQuantity: 5,
          damagedQuantity: 0,
          lostQuantity: 0,
          missingQuantity: 0,
        })),
        createdById: createdReturn.createdById,
        createdAt: now,
        updatedAt: now,
      });
      returnRepository.seed([completedReturn]);

      const result = await syncRentalOrderStatusFromReturns(RENTAL_ORDER_ID, {
        dispatchRepository,
        returnRepository,
        rentalOrderRepository,
      });

      expect(result).toBe("COMPLETED");
      expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
        "COMPLETED",
      );
    });
  });

  describe("T30.7 cancel dispatch releases claim", () => {
    it("allows a new dispatch after cancelling a prior claim", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([
        buildDispatchEntity({
          status: "DRAFT",
          items: [
            {
              id: "claim-line",
              productId: PRODUCT_ID as ProductId,
              rentalOrderItemId: ITEM_ID,
              quantity: 10,
              ownedQuantity: null,
              externalQuantity: null,
              notes: null,
            },
          ],
        }),
      ]);
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
      const auditLogger = new MockAuditLogger();

      const cancelService = new CancelDispatchService(
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

      await cancelService.execute({ id: DISPATCH_ID });

      const claimedAfterCancel =
        await dispatchRepository.sumClaimedSourceQuantitiesByRentalOrderId(
          RENTAL_ORDER_ID,
        );
      expect(claimedAfterCancel.owned.get(ITEM_ID) ?? 0).toBe(0);

      const { service: createService } = buildCreateService({
        dispatchRepository,
        rentalOrderRepository,
        auditLogger,
      });

      await expect(
        createService.execute(createDispatchInput(10, "DSP-AFTER-CANCEL")),
      ).resolves.toBeDefined();
    });
  });

  describe("T30.8 CompleteDispatch Phase 29 regression", () => {
    it("only one concurrent completion succeeds with single side-effect pass", async () => {
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
      const auditLogger = new MockAuditLogger();

      const service = new CompleteDispatchService(
        createPassThroughTransactionRunner({
          dispatchRepository,
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          externalRentalRepository: new InMemoryExternalRentalRepository(),
          auditLogger,
          ...mockNotificationWriteScopeDeps,
          userId: USER_ID,
        }),
      );

      const results = await Promise.allSettled([
        service.execute({ id: DISPATCH_ID }),
        service.execute({ id: DISPATCH_ID }),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

      const rejected = results.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      expect(rejected?.reason).toBeInstanceOf(ConcurrentUpdateError);

      expect(stockMovementRepository.count()).toBe(2);
    });
  });
});

describe("Phase 30 additional edge coverage", () => {
  it("excludes CANCELLED dispatches from Rollup A", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildDispatchEntity({ status: "CANCELLED" }),
      buildDispatchEntity({
        id: dispatchIdFromIndex(7001),
        status: "DRAFT",
        items: [
          {
            id: "active-line",
            productId: PRODUCT_ID as ProductId,
            rentalOrderItemId: ITEM_ID,
            quantity: 4,
            ownedQuantity: null,
            externalQuantity: null,
            notes: null,
          },
        ],
      }),
    ]);

    const claimed =
      await dispatchRepository.sumClaimedSourceQuantitiesByRentalOrderId(
        RENTAL_ORDER_ID,
      );

    expect(claimed.owned.get(ITEM_ID)).toBe(4);
  });

  it("concurrent creates on different rental orders both succeed", async () => {
    const otherOrderId =
      "aa0e8400-e29b-41d4-a716-446655440099" as RentalOrderId;
    const otherItemId = "cc0e8400-e29b-41d4-a716-446655440099";

    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildReservedRentalOrderEntity(),
      buildRentalOrderEntity({
        id: otherOrderId,
        status: "RESERVED",
        reservedQuantity: 10,
        items: [
          {
            id: otherItemId,
            productId: PRODUCT_ID as ProductId,
            quantity: 10,
            dailyRate: 100,
            reservedQuantity: 10,
            startDate: new Date("2026-02-01T00:00:00.000Z"),
            endDate: new Date("2026-02-05T00:00:00.000Z"),
            numberOfDays: 4,
          },
        ],
      }),
    ]);

    const { service } = buildCreateService({
      dispatchRepository,
      rentalOrderRepository,
    });

    const results = await Promise.allSettled([
      service.execute(createDispatchInput(10, "DSP-ORDER-A")),
      service.execute({
        ...createDispatchInput(10, "DSP-ORDER-B"),
        rentalOrderId: otherOrderId,
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: otherItemId,
            quantity: 10,
          },
        ],
      }),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(dispatchRepository.count()).toBe(2);
  });
});
