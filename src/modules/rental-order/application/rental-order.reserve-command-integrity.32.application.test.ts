import { describe, expect, it } from "vitest";

import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import {
  INVENTORY_ID,
  OTHER_INVENTORY_ID,
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { ConfirmRentalOrderService } from "@/modules/rental-order/application/services/confirm-rental-order.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
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
  buildRentalOrderEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const RO_ID = RENTAL_ORDER_ID;
const RO_B_ID = OTHER_RENTAL_ORDER_ID;
const LINE_A_ITEM_ID = ITEM_ID;
const LINE_B_ITEM_ID = "dd0e8400-e29b-41d4-a716-446655440002";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function buildConfirmedOrder(
  id: RentalOrderId,
  itemId: string,
  options: {
    quantity?: number;
    reservedQuantity?: number;
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
      orderNumber: id === RO_ID ? "RO-T32" : "RO-T32-B",
      warehouseId: options.warehouseId ?? WAREHOUSE_ID,
      startDate: start,
      endDate: end,
      items: [
        {
          productId: options.productId ?? PRODUCT_ID,
          quantity: options.quantity ?? 10,
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
      reservedQuantity: options.reservedQuantity ?? 0,
    })),
    createdById: created.createdById,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  });
}

function buildMultiLineConfirmedOrder(
  options: {
    lineAQuantity?: number;
    lineBQuantity?: number;
    lineAReserved?: number;
    lineBReserved?: number;
  } = {},
): RentalOrder {
  const start = d(2026, 2, 1);
  const end = d(2026, 2, 5);
  const created = RentalOrder.create(
    buildCreateRentalOrderData({
      startDate: start,
      endDate: end,
      items: [
        {
          productId: PRODUCT_ID,
          quantity: options.lineAQuantity ?? 10,
          dailyRate: 10,
          startDate: start,
          endDate: end,
        },
        {
          productId: OTHER_PRODUCT_ID,
          quantity: options.lineBQuantity ?? 10,
          dailyRate: 10,
          startDate: start,
          endDate: end,
        },
      ],
    }),
  );

  return RentalOrder.reconstitute({
    id: RO_ID,
    orderNumber: created.orderNumber,
    customerId: created.customerId,
    warehouseId: created.warehouseId,
    status: "CONFIRMED",
    startDate: start,
    endDate: end,
    remarks: created.remarks,
    items: created.items.map((item, index) => ({
      ...item,
      id: index === 0 ? LINE_A_ITEM_ID : LINE_B_ITEM_ID,
      reservedQuantity:
        index === 0
          ? (options.lineAReserved ?? 0)
          : (options.lineBReserved ?? 0),
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

class ReserveFailingInventoryRepository
  extends InMemoryInventoryRepository
  implements IInventoryRepository
{
  override async reserveAvailableQuantity(): Promise<null> {
    return null;
  }
}

describe("Phase 32 rental order reserve command integrity", () => {
  describe("T32.1 same-order concurrent partial reserve", () => {
    it("cumulative +4 and +3 yields final reserved 7", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_ID, LINE_A_ITEM_ID, { quantity: 10 }),
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
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 4 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 3 }] },
        ),
      ]);

      expect(results.every((result) => result.status === "fulfilled")).toBe(
        true,
      );

      const order = await rentalOrderRepository.findById(RO_ID);
      expect(order?.items[0]?.reservedQuantity).toBe(7);

      const inventory = await inventoryRepository.findById(INVENTORY_ID);
      expect(inventory?.reservedQuantity).toBe(7);
      expect(stockMovementRepository.count()).toBe(2);
    });
  });

  describe("T32.2 exact cumulative proof", () => {
    it("final line quantity is 7 not 4 or 3", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_ID, LINE_A_ITEM_ID, { quantity: 10 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 4 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 3 }] },
        ),
      ]);

      const order = await rentalOrderRepository.findById(RO_ID);
      const reserved = order?.items[0]?.reservedQuantity;
      expect(reserved).toBe(7);
      expect(reserved).not.toBe(4);
      expect(reserved).not.toBe(3);
    });
  });

  describe("T32.3 exceeds remaining line quantity", () => {
    it("rejects one concurrent +3 when only 2 remain on a qty-10 line at 8", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_ID, LINE_A_ITEM_ID, {
          quantity: 10,
          reservedQuantity: 8,
        }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 8 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      const results = await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 3 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 3 }] },
        ),
      ]);

      const rejected = results.filter((result) => result.status === "rejected");
      expect(rejected.length).toBeGreaterThanOrEqual(1);
      expect(
        (rejected[0] as PromiseRejectedResult).reason,
      ).toBeInstanceOf(UnprocessableError);

      const order = await rentalOrderRepository.findById(RO_ID);
      expect(order?.items[0]?.reservedQuantity).toBeLessThanOrEqual(10);
    });
  });

  describe("T32.4 cross-order regression", () => {
    it("allows only one full reserve when capacity is 5", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_ID, LINE_A_ITEM_ID, { quantity: 5 }),
        buildConfirmedOrder(RO_B_ID, LINE_B_ITEM_ID, { quantity: 5 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 5, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      const results = await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
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

      const inventory = await inventoryRepository.findById(INVENTORY_ID);
      expect(inventory?.reservedQuantity).toBe(5);
    });
  });

  describe("T32.5 cancel vs reserve", () => {
    it("serializes cancel and reserve without inventory desync", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildReservedRentalOrderEntity(),
        buildConfirmedOrder(RO_B_ID, LINE_B_ITEM_ID, { quantity: 5 }),
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
        new CancelRentalOrderService(runner).execute({ id: RO_ID }),
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

  describe("T32.6 confirm vs reserve", () => {
    it("does not alter confirm semantics when run parallel with reserve", async () => {
      const draftOrder = buildRentalOrderEntity();
      const confirmedNeighbor = buildConfirmedOrder(RO_B_ID, LINE_B_ITEM_ID, {
        quantity: 5,
      });

      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([draftOrder, confirmedNeighbor]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );

      const results = await Promise.allSettled([
        new ConfirmRentalOrderService(runner).execute({ id: RO_ID }),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_B_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ]);

      expect(results.every((result) => result.status === "fulfilled")).toBe(
        true,
      );

      const confirmed = await rentalOrderRepository.findById(RO_ID);
      expect(confirmed?.status).toBe("CONFIRMED");
    });
  });

  describe("T32.7 rollback after RO lock", () => {
    it("leaves no reservation when RESERVE fails after lock acquisition", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_ID, LINE_A_ITEM_ID, { quantity: 5 }),
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
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 5 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const order = await rentalOrderRepository.findById(RO_ID);
      expect(order?.items[0]?.reservedQuantity).toBe(0);
      expect(stockMovementRepository.count()).toBe(0);
    });
  });

  describe("T32.8 sequential partial cumulative", () => {
    it("await +4 then +3 yields final reserved 7", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildConfirmedOrder(RO_ID, LINE_A_ITEM_ID, { quantity: 10 }),
      ]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({ quantityOnHand: 10, reservedQuantity: 0 }),
      ]);

      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
      );
      const service = new ReserveRentalOrderService(runner);

      await service.execute(
        { id: RO_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 4 }] },
      );
      await service.execute(
        { id: RO_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 3 }] },
      );

      const order = await rentalOrderRepository.findById(RO_ID);
      expect(order?.items[0]?.reservedQuantity).toBe(7);
    });
  });

  describe("T32.9 multi-line same-order concurrent reserve", () => {
    it("preserves both line deltas without clobbering sibling lines", async () => {
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([buildMultiLineConfirmedOrder()]);

      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          quantityOnHand: 10,
          reservedQuantity: 0,
        }),
        buildInventoryEntity({
          id: OTHER_INVENTORY_ID,
          productId: OTHER_PRODUCT_ID,
          quantityOnHand: 10,
          reservedQuantity: 0,
        }),
      ]);

      const stockMovementRepository = new InMemoryStockMovementRepository();
      const runner = createSharedScope(
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
      );

      const results = await Promise.allSettled([
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
          { items: [{ productId: PRODUCT_ID, quantity: 4 }] },
        ),
        new ReserveRentalOrderService(runner).execute(
          { id: RO_ID },
          { items: [{ productId: OTHER_PRODUCT_ID, quantity: 3 }] },
        ),
      ]);

      expect(results.every((result) => result.status === "fulfilled")).toBe(
        true,
      );

      const order = await rentalOrderRepository.findById(RO_ID);
      const lineA = order?.items.find((item) => item.productId === PRODUCT_ID);
      const lineB = order?.items.find(
        (item) => item.productId === OTHER_PRODUCT_ID,
      );

      expect(lineA?.reservedQuantity).toBe(4);
      expect(lineB?.reservedQuantity).toBe(3);
      expect(stockMovementRepository.count()).toBe(2);

      const invA = await inventoryRepository.findById(INVENTORY_ID);
      const invB = await inventoryRepository.findById(OTHER_INVENTORY_ID);
      expect(invA?.reservedQuantity).toBe(4);
      expect(invB?.reservedQuantity).toBe(3);
    });
  });
});
