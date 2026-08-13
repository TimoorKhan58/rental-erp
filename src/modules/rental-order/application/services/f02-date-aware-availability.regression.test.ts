/**
 * Phase 25.4.4 — F-02 regression hardening.
 *
 * Sequential date-aware reservation conflicts are prevented; concurrent
 * date-aware commitment races remain a known limitation (atomic RESERVE only
 * serializes physical reservedQuantity <= quantityOnHand).
 */
import { describe, expect, it, vi } from "vitest";

import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { GetDateAwareAvailabilityService } from "@/modules/rental-order/application/services/get-date-aware-availability.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import type { AvailabilityCommitmentLineProjection } from "@/modules/rental-order/domain/rental-order.availability.projection";
import {
  calculateCommitmentQuantity,
  calculateDateAwareAvailabilitySnapshot,
  isAvailabilityCommitmentStatus,
} from "@/modules/rental-order/domain/rental-order.availability.rules";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import { buildDispatchEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import {
  OTHER_WAREHOUSE_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import {
  INVENTORY_ID,
  OTHER_INVENTORY_ID,
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import type {
  ProductId,
  RentalOrderId,
  WarehouseId,
} from "@/shared/domain/ids";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import { isActiveRentalStatus } from "@/modules/reporting/domain/reporting.rules";

import {
  ITEM_ID,
  OTHER_RENTAL_ORDER_ID,
  RENTAL_ORDER_ID,
  buildCreateRentalOrderData,
  buildRentalOrderEntity,
} from "../../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../../tests/helpers/transaction-test-runner";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function createWriteScope(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  options: {
    stockMovementRepository?: InMemoryStockMovementRepository;
    dispatchRepository?: InMemoryDispatchRepository;
    auditLogger?: MockAuditLogger;
    userId?: string;
  } = {},
) {
  return createPassThroughTransactionRunner({
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository:
      options.stockMovementRepository ?? new InMemoryStockMovementRepository(),
    dispatchRepository:
      options.dispatchRepository ?? new InMemoryDispatchRepository(),
    externalRentalRepository: new InMemoryExternalRentalRepository(),
    auditLogger: options.auditLogger ?? new MockAuditLogger(),
    ...mockNotificationWriteScopeDeps,
    userId: options.userId ?? USER_ID,
  });
}

function commitment(
  override: Partial<AvailabilityCommitmentLineProjection> & {
    reservedQuantity: number;
    status?: RentalOrderStatus;
  },
): AvailabilityCommitmentLineProjection {
  return {
    rentalOrderItemId: override.rentalOrderItemId ?? crypto.randomUUID(),
    rentalOrderId: override.rentalOrderId ?? OTHER_RENTAL_ORDER_ID,
    productId: (override.productId ?? PRODUCT_ID) as ProductId,
    warehouseId: (override.warehouseId ?? WAREHOUSE_ID) as WarehouseId,
    status: override.status ?? "RESERVED",
    reservedQuantity: override.reservedQuantity,
    eventStartDate: override.eventStartDate ?? d(2026, 2, 1),
    eventEndDate: override.eventEndDate ?? d(2026, 2, 5),
    dispatches: override.dispatches ?? [],
    returns: override.returns ?? [],
  };
}

function buildConfirmedForPeriod(
  start: Date,
  end: Date,
  options: {
    id?: RentalOrderId;
    quantity?: number;
    reservedQuantity?: number;
    warehouseId?: WarehouseId;
    productId?: ProductId;
    status?: RentalOrderStatus;
  } = {},
): RentalOrder {
  const created = RentalOrder.create(
    buildCreateRentalOrderData({
      warehouseId: options.warehouseId ?? WAREHOUSE_ID,
      startDate: start,
      endDate: end,
      items: [
        {
          productId: options.productId ?? PRODUCT_ID,
          quantity: options.quantity ?? 100,
          dailyRate: 10,
          startDate: start,
          endDate: end,
        },
      ],
    }),
  );

  return RentalOrder.reconstitute({
    id: options.id ?? RENTAL_ORDER_ID,
    orderNumber: created.orderNumber,
    customerId: created.customerId,
    warehouseId: created.warehouseId,
    status: options.status ?? "CONFIRMED",
    startDate: start,
    endDate: end,
    remarks: created.remarks,
    items: created.items.map((item, index) => ({
      ...item,
      id: index === 0 ? ITEM_ID : crypto.randomUUID(),
      reservedQuantity: options.reservedQuantity ?? 0,
    })),
    createdById: created.createdById,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  });
}

describe("Phase 25.4.4 F-02 regression hardening", () => {
  describe("cancel frees date-aware capacity", () => {
    it("blocked overlapping reserve succeeds after competitor cancel + RELEASE", async () => {
      const orderAId = OTHER_RENTAL_ORDER_ID;
      const orderBId = RENTAL_ORDER_ID;

      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          id: orderAId,
          quantity: 100,
          reservedQuantity: 100,
          status: "RESERVED",
        }),
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          id: orderBId,
          quantity: 100,
          reservedQuantity: 0,
          status: "CONFIRMED",
        }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          rentalOrderId: orderAId,
          reservedQuantity: 100,
          status: "RESERVED",
        }),
      ]);

      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
      ]);
      const stockMovements = new InMemoryStockMovementRepository();
      const dispatchRepository = new InMemoryDispatchRepository();

      await expect(
        new ReserveRentalOrderService(
          createWriteScope(rentalOrders, inventory, {
            stockMovementRepository: stockMovements,
            dispatchRepository,
          }),
        ).execute(
          { id: orderBId },
          { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const cancelled = await new CancelRentalOrderService(
        createWriteScope(rentalOrders, inventory, {
          stockMovementRepository: stockMovements,
          dispatchRepository,
        }),
      ).execute({ id: orderAId });

      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.items[0]?.reservedQuantity).toBe(0);
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(0);

      // CANCELLED no longer consumes date-aware capacity.
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          rentalOrderId: orderAId,
          reservedQuantity: 0,
          status: "CANCELLED",
        }),
      ]);

      const reservedB = await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory, {
          stockMovementRepository: stockMovements,
          dispatchRepository,
        }),
      ).execute(
        { id: orderBId },
        { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
      );

      expect(reservedB.status).toBe("RESERVED");
      expect(reservedB.items[0]?.reservedQuantity).toBe(100);
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        100,
      );
    });

    it("cancel remains blocked by non-CANCELLED dispatch (F-01 guard)", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          quantity: 100,
          reservedQuantity: 100,
          status: "RESERVED",
        }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
      ]);
      const dispatchRepository = new InMemoryDispatchRepository();
      dispatchRepository.seed([
        buildDispatchEntity({ status: "READY" }),
      ]);

      await expect(
        new CancelRentalOrderService(
          createWriteScope(rentalOrders, inventory, { dispatchRepository }),
        ).execute({ id: RENTAL_ORDER_ID }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("active dispatch"),
      });

      expect(
        (await rentalOrders.findById(RENTAL_ORDER_ID))?.status,
      ).toBe("RESERVED");
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        100,
      );
    });
  });

  describe("self-order + external commitment", () => {
    it("R9: additional delta fails when external commitment exhausts capacity", async () => {
      // A already holds 60 (excluded). B holds 50. Available excluding A = 50.
      // A requests +51 → date-aware reject; inventory/order unchanged.
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          quantity: 100,
          reservedQuantity: 60,
        }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          rentalOrderId: RENTAL_ORDER_ID,
          reservedQuantity: 60,
          status: "RESERVED",
        }),
        commitment({
          rentalOrderId: OTHER_RENTAL_ORDER_ID,
          reservedQuantity: 50,
          status: "RESERVED",
        }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 60 }),
      ]);

      await expect(
        new ReserveRentalOrderService(
          createWriteScope(rentalOrders, inventory),
        ).execute(
          { id: RENTAL_ORDER_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 51 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      expect(
        (await rentalOrders.findById(RENTAL_ORDER_ID))?.items[0]
          ?.reservedQuantity,
      ).toBe(60);
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        60,
      );
    });

    it("R9 pass: additional delta within remaining external capacity", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          quantity: 100,
          reservedQuantity: 60,
        }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          rentalOrderId: RENTAL_ORDER_ID,
          reservedQuantity: 60,
          status: "RESERVED",
        }),
        commitment({
          rentalOrderId: OTHER_RENTAL_ORDER_ID,
          reservedQuantity: 30,
          status: "RESERVED",
        }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 60 }),
      ]);

      const result = await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 40 }] },
      );

      expect(result.items[0]?.reservedQuantity).toBe(100);
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        100,
      );
    });
  });

  describe("multi-line / product isolation", () => {
    it("reverse order: first line fails date-aware → no mutation on later lines", async () => {
      const created = RentalOrder.create(
        buildCreateRentalOrderData({
          startDate: d(2026, 2, 1),
          endDate: d(2026, 2, 5),
          items: [
            {
              productId: PRODUCT_ID,
              quantity: 10,
              dailyRate: 10,
              startDate: d(2026, 2, 1),
              endDate: d(2026, 2, 5),
            },
            {
              productId: OTHER_PRODUCT_ID,
              quantity: 10,
              dailyRate: 10,
              startDate: d(2026, 2, 1),
              endDate: d(2026, 2, 5),
            },
          ],
        }),
      );
      const order = RentalOrder.reconstitute({
        id: RENTAL_ORDER_ID,
        orderNumber: created.orderNumber,
        customerId: created.customerId,
        warehouseId: created.warehouseId,
        status: "CONFIRMED",
        startDate: created.startDate,
        endDate: created.endDate,
        remarks: created.remarks,
        items: created.items.map((item, index) => ({
          ...item,
          id:
            index === 0
              ? ITEM_ID
              : "dd0e8400-e29b-41d4-a716-446655440099",
          reservedQuantity: 0,
        })),
        createdById: created.createdById,
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
        updatedAt: new Date("2026-01-15T10:00:00.000Z"),
      });

      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([order]);
      // Exhaust PRODUCT_ID only (first line).
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({ productId: PRODUCT_ID, reservedQuantity: 100 }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          quantityOnHand: 100,
          reservedQuantity: 0,
        }),
        buildInventoryEntity({
          id: OTHER_INVENTORY_ID,
          productId: OTHER_PRODUCT_ID,
          quantityOnHand: 100,
          reservedQuantity: 0,
        }),
      ]);
      const stockMovements = new InMemoryStockMovementRepository();

      await expect(
        new ReserveRentalOrderService(
          createRollbackTransactionRunner(
            rentalOrders,
            inventory,
            stockMovements,
            new MockAuditLogger(),
            USER_ID,
          ),
        ).execute(
          { id: RENTAL_ORDER_ID },
          {
            items: [
              { productId: PRODUCT_ID, quantity: 10 },
              { productId: OTHER_PRODUCT_ID, quantity: 10 },
            ],
          },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const reloaded = await rentalOrders.findById(RENTAL_ORDER_ID);
      expect(reloaded?.items.every((item) => item.reservedQuantity === 0)).toBe(
        true,
      );
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(0);
      expect(
        (await inventory.findById(OTHER_INVENTORY_ID))?.reservedQuantity,
      ).toBe(0);
      expect(stockMovements.count()).toBe(0);
    });

    it("independent Product B reservation succeeds while Product A is exhausted", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          productId: OTHER_PRODUCT_ID,
          quantity: 50,
        }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({ productId: PRODUCT_ID, reservedQuantity: 100 }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({
          productId: OTHER_PRODUCT_ID,
          quantityOnHand: 100,
          reservedQuantity: 0,
        }),
      ]);

      const result = await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: OTHER_PRODUCT_ID, quantity: 50 }] },
      );

      expect(result.status).toBe("RESERVED");
    });
  });

  describe("status / projection / inventory integrity", () => {
    it("DISPATCHED lasting status does not consume capacity", async () => {
      expect(isAvailabilityCommitmentStatus("DISPATCHED")).toBe(false);

      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 100 }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({ status: "DISPATCHED", reservedQuantity: 100 }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
      ]);

      const result = await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
      );
      expect(result.status).toBe("RESERVED");
    });

    it("availability projection returns all commitments (no pageSize 100 cap)", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      const lines = Array.from({ length: 101 }, () =>
        commitment({
          rentalOrderId: crypto.randomUUID() as RentalOrderId,
          reservedQuantity: 1,
          eventStartDate: d(2026, 2, 1),
          eventEndDate: d(2026, 2, 5),
        }),
      );
      rentalOrders.seedAvailabilityCommitmentLines(lines);

      const found = await rentalOrders.findAvailabilityCommitmentLines({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
      });

      expect(found).toHaveLength(101);

      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 200, reservedQuantity: 0 }),
      ]);
      const snapshot = await new GetDateAwareAvailabilityService(
        rentalOrders,
        inventory,
      ).execute({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        startDate: d(2026, 2, 1),
        endDate: d(2026, 2, 5),
      });

      expect(snapshot.dateAwareCommittedQuantity).toBe(101);
    });

    it("physical inventory invariants hold after successful reserve", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 40 }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 10 }),
      ]);

      await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 40 }] },
      );

      const row = await inventory.findById(INVENTORY_ID);
      expect(row?.quantityOnHand).toBeGreaterThanOrEqual(0);
      expect(row?.reservedQuantity).toBeGreaterThanOrEqual(0);
      expect(row!.reservedQuantity).toBeLessThanOrEqual(row!.quantityOnHand);
    });

    it("warehouse isolation: OTHER warehouse exhaustion does not block local reserve", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 50 }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          warehouseId: OTHER_WAREHOUSE_ID,
          reservedQuantity: 100,
        }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
      ]);

      await expect(
        new ReserveRentalOrderService(
          createWriteScope(rentalOrders, inventory),
        ).execute(
          { id: RENTAL_ORDER_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 50 }] },
        ),
      ).resolves.toMatchObject({ status: "RESERVED" });
    });
  });

  describe("dispatch / return commitment coherence", () => {
    it("multi-dispatch + partial return commitmentQty is coherent", () => {
      // reserved 100, dispatch 60+40, return 40 → hold 0 + out 60 = 60
      const mid = calculateCommitmentQuantity({
        reservedQuantity: 100,
        dispatches: [
          { status: "COMPLETED", quantity: 60 },
          { status: "COMPLETED", quantity: 40 },
        ],
        returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
      });
      expect(mid).toEqual({
        undispatchedHold: 0,
        outstandingOut: 60,
        commitmentQty: 60,
      });

      const done = calculateCommitmentQuantity({
        reservedQuantity: 100,
        dispatches: [
          { status: "COMPLETED", quantity: 60 },
          { status: "COMPLETED", quantity: 40 },
        ],
        returns: [
          { status: "COMPLETED", returnedQuantity: 40 },
          { status: "COMPLETED", returnedQuantity: 60 },
        ],
      });
      expect(done.commitmentQty).toBe(0);
      expect(done.outstandingOut).toBe(0);
    });

    it("ON_RENT double-count: onHand reduced + outstandingOut restored", () => {
      const snapshot = calculateDateAwareAvailabilitySnapshot({
        quantityOnHand: 0,
        reservedQuantity: 0,
        requestedPeriod: {
          startDate: d(2026, 2, 1),
          endDate: d(2026, 2, 5),
        },
        lines: [
          {
            status: "ON_RENT",
            eventStartDate: d(2026, 2, 1),
            eventEndDate: d(2026, 2, 5),
            reservedQuantity: 100,
            dispatches: [{ status: "COMPLETED", quantity: 100 }],
            returns: [],
          },
        ],
      });

      expect(snapshot.baseCapacity).toBe(100);
      expect(snapshot.dateAwareCommittedQuantity).toBe(100);
      expect(snapshot.dateAwareAvailableQuantity).toBe(0);
      // Must NOT be negative from double-subtraction of the same 100.
      expect(snapshot.dateAwareAvailableQuantity).toBeGreaterThanOrEqual(0);
    });

    it("cancelled dispatch claim restores undispatched hold", () => {
      const result = calculateCommitmentQuantity({
        reservedQuantity: 100,
        dispatches: [
          { status: "CANCELLED", quantity: 60 },
          { status: "COMPLETED", quantity: 40 },
        ],
        returns: [],
      });
      expect(result.undispatchedHold).toBe(60);
      expect(result.outstandingOut).toBe(40);
      expect(result.commitmentQty).toBe(100);
    });
  });

  describe("availability read-only + analytics separation", () => {
    it("GetDateAwareAvailabilityService does not mutate inventory/orders/movements", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([buildRentalOrderEntity()]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({ reservedQuantity: 10 }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
      ]);
      const reserveSpy = vi.spyOn(inventory, "reserveAvailableQuantity");
      const releaseSpy = vi.spyOn(inventory, "releaseReservedQuantity");
      const updateSpy = vi.spyOn(inventory, "update");
      const orderUpdateSpy = vi.spyOn(rentalOrders, "update");
      const orderReserveSpy = vi.spyOn(rentalOrders, "updateReserve");

      await new GetDateAwareAvailabilityService(rentalOrders, inventory).execute(
        {
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          startDate: d(2026, 2, 1),
          endDate: d(2026, 2, 5),
        },
      );

      expect(reserveSpy).not.toHaveBeenCalled();
      expect(releaseSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(orderUpdateSpy).not.toHaveBeenCalled();
      expect(orderReserveSpy).not.toHaveBeenCalled();
    });

    it("Active Rentals analytics remain CONFIRMED+RESERVED (≠ F-02 commitments)", () => {
      expect(isActiveRentalStatus("CONFIRMED")).toBe(true);
      expect(isActiveRentalStatus("RESERVED")).toBe(true);
      expect(isActiveRentalStatus("ON_RENT")).toBe(false);
      expect(isActiveRentalStatus("PARTIALLY_RETURNED")).toBe(false);

      expect(isAvailabilityCommitmentStatus("CONFIRMED")).toBe(false);
      expect(isAvailabilityCommitmentStatus("RESERVED")).toBe(true);
      expect(isAvailabilityCommitmentStatus("ON_RENT")).toBe(true);
      expect(isAvailabilityCommitmentStatus("PARTIALLY_RETURNED")).toBe(true);
    });
  });
});
