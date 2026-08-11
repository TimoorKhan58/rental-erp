import { describe, expect, it } from "vitest";

import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import type { AvailabilityCommitmentLineProjection } from "@/modules/rental-order/domain/rental-order.availability.projection";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { OTHER_WAREHOUSE_ID } from "@/modules/inventory/tests/helpers/inventory.fixtures";
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

import {
  ITEM_ID,
  OTHER_RENTAL_ORDER_ID,
  RENTAL_ORDER_ID,
  buildCreateRentalOrderData,
  buildPartiallyReservedConfirmedEntity,
} from "../../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../../tests/helpers/transaction-test-runner";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function createWriteScope(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository = new InMemoryStockMovementRepository(),
  auditLogger: MockAuditLogger = new MockAuditLogger(),
  userId: string | undefined = USER_ID,
) {
  return createPassThroughTransactionRunner({
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    dispatchRepository: new InMemoryDispatchRepository(),
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId,
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
    status: "CONFIRMED",
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

describe("ReserveRentalOrderService date-aware availability (Phase 25.4.3)", () => {
  it("A: no competing order → reservation succeeds", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 100 }),
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
    expect(result.items[0]?.reservedQuantity).toBe(100);
  });

  it("B: overlapping competing reservation → rejected", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 1 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({ reservedQuantity: 100 }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
    ]);

    await expect(
      new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining("date-aware availability"),
    });

    const order = await rentalOrders.findById(RENTAL_ORDER_ID);
    expect(order?.items[0]?.reservedQuantity).toBe(0);
    expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(
      100,
    );
  });

  it("C: non-overlapping reservation → succeeds", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 6), d(2026, 2, 10), { quantity: 100 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        reservedQuantity: 100,
        eventStartDate: d(2026, 2, 1),
        eventEndDate: d(2026, 2, 5),
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
    ]);

    // Physical capacity still blocks: reserved=100, onHand=100.
    // Use onHand restored for adjacent-period planning while competitor hold remains timeless.
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

  it("D: boundary overlap (shared day) → conflict", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 5), d(2026, 2, 10), { quantity: 1 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        reservedQuantity: 100,
        eventStartDate: d(2026, 2, 1),
        eventEndDate: d(2026, 2, 5),
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
        { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("E: adjacent non-overlap → succeeds", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 6), d(2026, 2, 10), { quantity: 100 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        reservedQuantity: 100,
        eventStartDate: d(2026, 2, 1),
        eventEndDate: d(2026, 2, 5),
      }),
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

  it("F: self-order exclusion — only additional delta evaluated", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
        quantity: 100,
        reservedQuantity: 60,
      }),
    ]);
    // Competing projection for THIS order must be excluded.
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        rentalOrderId: RENTAL_ORDER_ID,
        reservedQuantity: 60,
        status: "RESERVED",
      }),
      commitment({
        rentalOrderId: OTHER_RENTAL_ORDER_ID,
        reservedQuantity: 30,
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
      { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
    );

    // available excluding self = 100 - 30 = 70; delta 10 OK; physical 60+10<=100
    expect(result.items[0]?.reservedQuantity).toBe(70);
  });

  it("G: multi-line atomicity — one conflict aborts all", async () => {
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
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        productId: OTHER_PRODUCT_ID,
        reservedQuantity: 100,
      }),
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

  it("H: different warehouse → unaffected", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
        quantity: 50,
        warehouseId: OTHER_WAREHOUSE_ID,
      }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        reservedQuantity: 100,
        warehouseId: WAREHOUSE_ID,
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({
        warehouseId: OTHER_WAREHOUSE_ID,
        quantityOnHand: 100,
        reservedQuantity: 0,
      }),
    ]);

    const result = await new ReserveRentalOrderService(
      createWriteScope(rentalOrders, inventory),
    ).execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 50 }] },
    );

    expect(result.status).toBe("RESERVED");
  });

  it("I: different product → unaffected", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
        quantity: 50,
        productId: OTHER_PRODUCT_ID,
      }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({ reservedQuantity: 100, productId: PRODUCT_ID }),
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

  it("J: CANCELLED overlapping ignored", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 100 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({ status: "CANCELLED", reservedQuantity: 100 }),
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

  it("K: DRAFT overlapping ignored", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 100 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({ status: "DRAFT", reservedQuantity: 100 }),
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
        { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
      ),
    ).resolves.toMatchObject({ status: "RESERVED" });
  });

  it("L: CONFIRMED overlapping ignored", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 100 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({ status: "CONFIRMED", reservedQuantity: 100 }),
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
        { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
      ),
    ).resolves.toMatchObject({ status: "RESERVED" });
  });

  it("M: RESERVED overlapping consumes", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 1 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({ status: "RESERVED", reservedQuantity: 100 }),
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
        { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("N: ON_RENT overlapping consumes", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 1 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 0, reservedQuantity: 0 }),
    ]);

    await expect(
      new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("O: PARTIALLY_RETURNED consumes outstanding", async () => {
    // outstandingOut=60 → baseCapacity=onHand(40)+60=100; committed=60 → available=40
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 40 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        status: "PARTIALLY_RETURNED",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
        returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 40, reservedQuantity: 0 }),
    ]);

    const ok = await new ReserveRentalOrderService(
      createWriteScope(rentalOrders, inventory),
    ).execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 40 }] },
    );
    expect(ok.items[0]?.reservedQuantity).toBe(40);
  });

  it("O2: PARTIALLY_RETURNED blocks beyond outstanding remainder", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 41 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        status: "PARTIALLY_RETURNED",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
        returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 40, reservedQuantity: 0 }),
    ]);

    await expect(
      new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 41 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("P: RETURNED/COMPLETED ignored", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 100 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({ status: "RETURNED", reservedQuantity: 100 }),
      commitment({ status: "COMPLETED", reservedQuantity: 100 }),
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

  it("Q: invalid date range rejected by availability period guard", async () => {
    const { assertValidAvailabilityPeriod } = await import(
      "@/modules/rental-order/domain/rental-order.availability.rules"
    );
    const { RentalOrderInvariantError } = await import(
      "@/modules/rental-order/domain/rental-order.errors"
    );

    // Entity reconstitution already forbids end < start; reserve uses the same
    // Phase 25.4.1 period guard before inventory mutation.
    expect(() =>
      assertValidAvailabilityPeriod({
        startDate: d(2026, 2, 10),
        endDate: d(2026, 2, 1),
      }),
    ).toThrow(RentalOrderInvariantError);

    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 1 }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);
    const { GetDateAwareAvailabilityService } = await import(
      "@/modules/rental-order/application/services/get-date-aware-availability.service"
    );

    await expect(
      new GetDateAwareAvailabilityService(rentalOrders, inventory).execute({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        startDate: d(2026, 2, 10),
        endDate: d(2026, 2, 1),
      }),
    ).rejects.toThrow();

    expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(0);
  });

  it("R: same-day reservation valid", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 1), { quantity: 10 }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);

    const result = await new ReserveRentalOrderService(
      createWriteScope(rentalOrders, inventory),
    ).execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
    );

    expect(result.status).toBe("RESERVED");
  });

  it("S: ON_RENT double-count regression", async () => {
    // After CompleteDispatch: onHand reduced, inventory reserved released,
    // line reservedQuantity may remain. Capacity uses outstandingOut restore.
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 1 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 0, reservedQuantity: 0 }),
    ]);

    // baseCapacity = 0 + 100; committed = 100; available = 0 (not double-subtracted)
    await expect(
      new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);

    rentalOrders.seedAvailabilityCommitmentLines([]);
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);
    const ok = await new ReserveRentalOrderService(
      createWriteScope(rentalOrders, inventory),
    ).execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
    );
    expect(ok.items[0]?.reservedQuantity).toBe(1);
  });

  it("T: date-aware passes but physical atomic RESERVE fails → rollback", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 10 }),
    ]);
    // No date commitments → date-aware available = onHand (100).
    // Physical reserved already 95 → RESERVE(10) fails.
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 95 }),
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
        { items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(
      (await rentalOrders.findById(RENTAL_ORDER_ID))?.items[0]
        ?.reservedQuantity,
    ).toBe(0);
    expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(95);
    expect(stockMovements.count()).toBe(0);
  });

  it("U: repeated / incremental reserve respects existing reserved qty", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([buildPartiallyReservedConfirmedEntity()]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 4 }),
    ]);

    const result = await new ReserveRentalOrderService(
      createWriteScope(rentalOrders, inventory),
    ).execute(
      { id: RENTAL_ORDER_ID },
      { items: [{ productId: PRODUCT_ID, quantity: 6 }] },
    );

    expect(result.items[0]?.reservedQuantity).toBe(10);
    expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(10);
  });

  it("V: CANCELLED dispatch claim does not consume undispatched hold", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 1 }),
    ]);
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        reservedQuantity: 100,
        dispatches: [{ status: "CANCELLED", quantity: 100 }],
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);

    // commitment still 100 (undispatched hold intact) → reject
    await expect(
      new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("W: multi-dispatch remaining hold remains coherent", async () => {
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seed([
      buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), { quantity: 50 }),
    ]);
    // Competing: reserved 100, dispatched 60 COMPLETED → commitment = 40 hold + 60 out = 100
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 60 }],
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 40, reservedQuantity: 0 }),
    ]);

    // baseCapacity = 40 + 60 = 100; committed = 100; available = 0
    await expect(
      new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 1 }] },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("GetDateAwareAvailabilityService excludeRentalOrderId", () => {
  it("excludes the specified rental order from commitments", async () => {
    const { GetDateAwareAvailabilityService } = await import(
      "@/modules/rental-order/application/services/get-date-aware-availability.service"
    );
    const rentalOrders = new InMemoryRentalOrderRepository();
    rentalOrders.seedAvailabilityCommitmentLines([
      commitment({
        rentalOrderId: RENTAL_ORDER_ID,
        reservedQuantity: 60,
      }),
      commitment({
        rentalOrderId: OTHER_RENTAL_ORDER_ID,
        reservedQuantity: 30,
      }),
    ]);
    const inventory = new InMemoryInventoryRepository();
    inventory.seed([
      buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 0 }),
    ]);

    const service = new GetDateAwareAvailabilityService(
      rentalOrders,
      inventory,
    );

    const withSelf = await service.execute({
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      startDate: d(2026, 2, 1),
      endDate: d(2026, 2, 5),
    });
    expect(withSelf.dateAwareCommittedQuantity).toBe(90);

    const excludingSelf = await service.execute({
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      startDate: d(2026, 2, 1),
      endDate: d(2026, 2, 5),
      excludeRentalOrderId: RENTAL_ORDER_ID,
    });
    expect(excludingSelf.dateAwareCommittedQuantity).toBe(30);
    expect(excludingSelf.dateAwareAvailableQuantity).toBe(70);
  });
});
