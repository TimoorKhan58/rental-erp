import { describe, expect, it } from "vitest";

import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import {
  INVENTORY_ID,
  OTHER_INVENTORY_ID,
  OTHER_PRODUCT_ID,
  OTHER_WAREHOUSE_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { GetDateAwareAvailabilityService } from "@/modules/rental-order/application/services/get-date-aware-availability.service";
import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import type { AvailabilityCommitmentLineProjection } from "@/modules/rental-order/domain/rental-order.availability.projection";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { USER_ID } from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import type { ProductId, RentalOrderId, WarehouseId } from "@/shared/domain/ids";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import {
  ITEM_ID,
  OTHER_RENTAL_ORDER_ID,
  RENTAL_ORDER_ID,
  buildCreateRentalOrderData,
  buildPartiallyReservedConfirmedEntity,
  buildRentalOrderEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const RO_A_ID = RENTAL_ORDER_ID;
const RO_B_ID = OTHER_RENTAL_ORDER_ID;
const RO_A_ITEM_ID = ITEM_ID;
const RO_B_ITEM_ID = "dd0e8400-e29b-41d4-a716-446655440002";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function buildConfirmedOrder(
  id: RentalOrderId,
  itemId: string,
  options: {
    quantity?: number;
    productId?: ProductId;
    warehouseId?: WarehouseId;
    start?: Date;
    end?: Date;
  } = {},
): RentalOrder {
  const start = options.start ?? d(2026, 2, 1);
  const end = options.end ?? d(2026, 2, 5);
  const created = RentalOrder.create(
    buildCreateRentalOrderData({
      orderNumber: id === RO_A_ID ? "RO-RACE-A" : "RO-RACE-B",
      warehouseId: options.warehouseId ?? WAREHOUSE_ID,
      startDate: start,
      endDate: end,
      items: [
        {
          productId: options.productId ?? PRODUCT_ID,
          quantity: options.quantity ?? 5,
          dailyRate: 10,
          startDate: start,
          endDate: end,
        },
      ],
    }),
  );

  return RentalOrder.reconstitute({
    id,
    orderNumber: created.orderNumber,
    customerId: created.customerId,
    warehouseId: created.warehouseId,
    status: "CONFIRMED",
    startDate: start,
    endDate: end,
    remarks: created.remarks,
    items: created.items.map((item) => ({
      ...item,
      id: itemId,
      reservedQuantity: 0,
    })),
    createdById: created.createdById,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  });
}

function createSharedScope(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository = new InMemoryStockMovementRepository(),
  auditLogger = new MockAuditLogger(),
) {
  return createPassThroughTransactionRunner({
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    dispatchRepository: new InMemoryDispatchRepository(),
    externalRentalRepository: new InMemoryExternalRentalRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });
}

function commitment(
  override: Partial<AvailabilityCommitmentLineProjection> & {
    reservedQuantity: number;
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

class ReserveFailingInventoryRepository
  extends InMemoryInventoryRepository
  implements IInventoryRepository
{
  override async reserveAvailableQuantity(): Promise<null> {
    return null;
  }
}

describe("Phase 31 date-aware availability serialization", () => {
  describe("T31.1 concurrent overlapping reservations", () => {
    it("allows exactly one full-capacity reserve under race", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 5 }),
        buildConfirmedOrder(RO_B_ID, RO_B_ITEM_ID, { quantity: 5 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 5, reservedQuantity: 0 }),
      ]);

      const stockMovementRepository = new InMemoryStockMovementRepository();
      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
      );

      const results = await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_B_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        UnprocessableError,
      );

      const inventory = await inventoryRepository.findById(INVENTORY_ID);
      expect(inventory?.reservedQuantity).toBe(5);

      const orderA = await rentalOrderRepository.findById(RO_A_ID);
      const orderB = await rentalOrderRepository.findById(RO_B_ID);
      const reservedCount =
        (orderA?.status === "RESERVED" ? 1 : 0) +
        (orderB?.status === "RESERVED" ? 1 : 0);
      expect(reservedCount).toBe(1);
      expect(stockMovementRepository.count()).toBe(1);
    });
  });

  describe("T31.2 concurrent partial reservations", () => {
    it("never over-commits aggregate capacity under concurrent deltas", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 10 }),
        buildConfirmedOrder(RO_B_ID, RO_B_ITEM_ID, { quantity: 10 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 6, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      const results = await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 6 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_B_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 6 }] },
        ),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      expect(fulfilled.length).toBeLessThanOrEqual(1);

      const inventory = await inventoryRepository.findById(INVENTORY_ID);
      expect(inventory?.reservedQuantity).toBeLessThanOrEqual(6);
    });
  });

  describe("T31.3 loser leaves no RentalOrder reservation mutation", () => {
    it("rejects loser without persisting reservedQuantity", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 5 }),
        buildConfirmedOrder(RO_B_ID, RO_B_ITEM_ID, { quantity: 5 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 5, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_B_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ]);

      const orderA = await rentalOrderRepository.findById(RO_A_ID);
      const orderB = await rentalOrderRepository.findById(RO_B_ID);
      const loser =
        orderA?.status === "CONFIRMED"
          ? orderA
          : orderB?.status === "CONFIRMED"
            ? orderB
            : null;

      expect(loser).not.toBeNull();
      expect(loser?.items[0]?.reservedQuantity).toBe(0);
    });
  });

  describe("T31.4 loser leaves no RESERVE movement", () => {
    it("creates only one RESERVE stock movement under race", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 5 }),
        buildConfirmedOrder(RO_B_ID, RO_B_ITEM_ID, { quantity: 5 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 5, reservedQuantity: 0 }),
      ]);

      const stockMovementRepository = new InMemoryStockMovementRepository();
      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
      );

      await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_B_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ]);

      expect(stockMovementRepository.count()).toBe(1);
    });
  });

  describe("T31.5 same RentalOrder concurrent reservation", () => {
    it("allows only one full reserve mutation on the same order", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 10 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
      ]);

      const stockMovementRepository = new InMemoryStockMovementRepository();
      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
      );

      const results = await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
        ),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const order = await rentalOrderRepository.findById(RO_A_ID);
      expect(order?.items[0]?.reservedQuantity).toBe(10);
      expect(order?.status).toBe("RESERVED");
      expect(stockMovementRepository.count()).toBe(1);
    });
  });

  describe("T31.6 cancel vs reserve race", () => {
    it("serializes cancel and reserve on shared inventory", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildReservedRentalOrderEntity(),
        buildConfirmedOrder(RO_B_ID, RO_B_ITEM_ID, { quantity: 5 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 10 }),
      ]);

      const stockMovementRepository = new InMemoryStockMovementRepository();
      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
      );

      const results = await Promise.allSettled([
        new CancelRentalOrderService(runner).execute({ id: RO_A_ID }),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_B_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ]);

      expect(
        results.filter((result) => result.status === "fulfilled").length,
      ).toBeGreaterThanOrEqual(1);

      const inventory = await inventoryRepository.findById(INVENTORY_ID);
      expect(inventory?.reservedQuantity).toBeGreaterThanOrEqual(0);
      expect(inventory?.reservedQuantity).toBeLessThanOrEqual(10);
    });
  });

  describe("T31.7 multiple inventory resources lock ordering", () => {
    it("reserves multi-product order without deadlock", async () => {
      const start = d(2026, 2, 1);
      const end = d(2026, 2, 5);
      const created = RentalOrder.create(
        buildCreateRentalOrderData({
          startDate: start,
          endDate: end,
          items: [
            {
              productId: PRODUCT_ID,
              quantity: 3,
              dailyRate: 10,
              startDate: start,
              endDate: end,
            },
            {
              productId: OTHER_PRODUCT_ID,
              quantity: 3,
              dailyRate: 10,
              startDate: start,
              endDate: end,
            },
          ],
        }),
      );

      const multiProductOrder = RentalOrder.reconstitute({
        id: RO_A_ID,
        orderNumber: created.orderNumber,
        customerId: created.customerId,
        warehouseId: created.warehouseId,
        status: "CONFIRMED",
        startDate: start,
        endDate: end,
        remarks: created.remarks,
        items: created.items.map((item, index) => ({
          ...item,
          id: index === 0 ? RO_A_ITEM_ID : RO_B_ITEM_ID,
          reservedQuantity: 0,
        })),
        createdById: created.createdById,
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
        updatedAt: new Date("2026-01-15T10:00:00.000Z"),
      });

      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([multiProductOrder]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          quantityOnHand: 3,
          reservedQuantity: 0,
        }),
        buildInventoryEntity({
          id: OTHER_INVENTORY_ID,
          productId: OTHER_PRODUCT_ID,
          quantityOnHand: 3,
          reservedQuantity: 0,
        }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      const result = await new ReserveRentalOrderService(runner).execute(
        { id: RO_A_ID },
        {
          items: [
            { productId: PRODUCT_ID, quantity: 3 },
            { productId: OTHER_PRODUCT_ID, quantity: 3 },
          ],
        },
      );

      expect(result.status).toBe("RESERVED");
    });
  });

  describe("T31.8 partial reservation all-or-nothing", () => {
    it("rejects request delta greater than post-lock availability", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 10 }),
      ]);
      rentalOrderRepository.seedAvailabilityCommitmentLines([
        commitment({ reservedQuantity: 4 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      await expect(
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 7 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const order = await rentalOrderRepository.findById(RO_A_ID);
      expect(order?.items[0]?.reservedQuantity).toBe(0);
      expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        0,
      );
    });

    it("accepts request delta within post-lock availability", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildPartiallyReservedConfirmedEntity()]);
      rentalOrderRepository.seedAvailabilityCommitmentLines([
        commitment({ reservedQuantity: 4 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 4 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      const result = await new ReserveRentalOrderService(runner).execute(
        { id: RO_A_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 2 }] },
      );

      expect(result.items[0]?.reservedQuantity).toBe(6);
    });
  });

  describe("T31.9 CONFIRMED exclusion from F-02 commitment", () => {
    it("does not reduce date-aware availability for overlapping CONFIRMED orders", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_B_ID, RO_B_ITEM_ID, { quantity: 100 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
      ]);

      const availability = await new GetDateAwareAvailabilityService(
        rentalOrderRepository,
        inventoryRepository,
      ).execute({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        startDate: d(2026, 2, 1),
        endDate: d(2026, 2, 5),
      });

      expect(availability.dateAwareCommittedQuantity).toBe(0);
      expect(availability.dateAwareAvailableQuantity).toBe(10);
    });

    it("counts overlapping RESERVED orders toward commitment", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildRentalOrderEntity({
          id: RO_B_ID,
          status: "RESERVED",
          reservedQuantity: 10,
        }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 10 }),
      ]);

      const availability = await new GetDateAwareAvailabilityService(
        rentalOrderRepository,
        inventoryRepository,
      ).execute({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        startDate: d(2026, 2, 1),
        endDate: d(2026, 2, 5),
      });

      expect(availability.dateAwareCommittedQuantity).toBe(10);
      expect(availability.dateAwareAvailableQuantity).toBe(0);
    });
  });

  describe("T31.10 external rental isolation", () => {
    it("does not count external dispatch claims against owned F-02 availability", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 5 }),
      ]);
      rentalOrderRepository.seedAvailabilityCommitmentLines([
        commitment({
          reservedQuantity: 0,
          status: "ON_RENT",
          dispatches: [
            {
              status: "COMPLETED",
              quantity: 5,
              ownedQuantity: 0,
            },
          ],
        }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 5, reservedQuantity: 0 }),
      ]);

      const result = await new ReserveRentalOrderService(
        createSharedScope(rentalOrderRepository, inventoryRepository),
      ).execute(
        { id: RO_A_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
      );

      expect(result.status).toBe("RESERVED");
    });
  });

  describe("T31.11 date boundaries", () => {
    it("rejects shared-day overlap and allows adjacent non-overlap", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, {
          quantity: 1,
          start: d(2026, 2, 5),
          end: d(2026, 2, 10),
        }),
      ]);
      rentalOrderRepository.seedAvailabilityCommitmentLines([
        commitment({
          reservedQuantity: 5,
          eventStartDate: d(2026, 2, 1),
          eventEndDate: d(2026, 2, 5),
        }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 5, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      await expect(
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, {
          quantity: 5,
          start: d(2026, 2, 6),
          end: d(2026, 2, 10),
        }),
      ]);

      const adjacentResult = await new ReserveRentalOrderService(runner).execute(
        { id: RO_A_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
      );

      expect(adjacentResult.status).toBe("RESERVED");
    });
  });

  describe("T31.12 rollback after lock acquisition", () => {
    it("leaves no reservation when RESERVE fails after F-02 pass", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, { quantity: 5 }),
      ]);

      const inventoryRepository = new ReserveFailingInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 5, reservedQuantity: 0 }),
      ]);

      const stockMovementRepository = new InMemoryStockMovementRepository();
      const auditLogger = new MockAuditLogger();
      const runner = createRollbackTransactionRunner(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        USER_ID,
      );

      await expect(
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const order = await rentalOrderRepository.findById(RO_A_ID);
      expect(order?.status).toBe("CONFIRMED");
      expect(order?.items[0]?.reservedQuantity).toBe(0);
      expect(stockMovementRepository.count()).toBe(0);
      expect((await inventoryRepository.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        0,
      );
    });
  });

  describe("T31.4 multi-warehouse independence", () => {
    it("allows concurrent reserves in different warehouses", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_A_ID, RO_A_ITEM_ID, {
          quantity: 5,
          warehouseId: WAREHOUSE_ID,
        }),
        buildConfirmedOrder(RO_B_ID, RO_B_ITEM_ID, {
          quantity: 5,
          warehouseId: OTHER_WAREHOUSE_ID,
        }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 5,
          reservedQuantity: 0,
        }),
        buildInventoryEntity({
          id: OTHER_INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: OTHER_WAREHOUSE_ID,
          quantityOnHand: 5,
          reservedQuantity: 0,
        }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      const results = await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_A_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_B_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ]);

      expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    });
  });
});
