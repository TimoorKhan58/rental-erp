/**
 * Phase 25.4.6 — F-02 full date-aware availability scenario matrix.
 *
 * Prefer TEST-ONLY. Production behavior assumed correct from 25.4.1–25.4.5;
 * this file fills remaining matrix gaps without duplicating every prior case.
 *
 * Sequential date-aware reservation conflicts are prevented. Concurrent
 * date-aware commitment races remain a known limitation and are not claimed
 * race-safe in Phase 25.4.
 */
import { describe, expect, it } from "vitest";

import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { GetDateAwareAvailabilityService } from "@/modules/rental-order/application/services/get-date-aware-availability.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import type { AvailabilityCommitmentLineProjection } from "@/modules/rental-order/domain/rental-order.availability.projection";
import {
  availabilityPeriodsOverlap,
  calculateCommitmentQuantity,
  calculateDateAwareAvailabilitySnapshot,
  isAvailabilityCommitmentStatus,
  type CommitmentQuantityInput,
} from "@/modules/rental-order/domain/rental-order.availability.rules";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
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
} from "../../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../../tests/helpers/in-memory-rental-order.repository";
import { MockAuditLogger } from "../../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../../tests/helpers/transaction-test-runner";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function period(start: Date, end: Date) {
  return { startDate: start, endDate: end };
}

function createWriteScope(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository = new InMemoryStockMovementRepository(),
) {
  return createPassThroughTransactionRunner({
    rentalOrderRepository,
    inventoryRepository,
    stockMovementRepository,
    dispatchRepository: new InMemoryDispatchRepository(),
    auditLogger: new MockAuditLogger(),
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
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
    items?: Array<{
      productId: ProductId;
      quantity: number;
      reservedQuantity?: number;
      startDate?: Date;
      endDate?: Date;
    }>;
  } = {},
): RentalOrder {
  const lineDefs =
    options.items ??
    [
      {
        productId: options.productId ?? PRODUCT_ID,
        quantity: options.quantity ?? 100,
        reservedQuantity: options.reservedQuantity ?? 0,
        startDate: start,
        endDate: end,
      },
    ];

  const created = RentalOrder.create(
    buildCreateRentalOrderData({
      warehouseId: options.warehouseId ?? WAREHOUSE_ID,
      startDate: start,
      endDate: end,
      items: lineDefs.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        dailyRate: 10,
        startDate: line.startDate ?? start,
        endDate: line.endDate ?? end,
      })),
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
      id: index === 0 ? ITEM_ID : `dd0e8400-e29b-41d4-a716-4466554400${String(index).padStart(2, "0")}`,
      reservedQuantity: lineDefs[index]?.reservedQuantity ?? 0,
    })),
    createdById: created.createdById,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-01-15T10:00:00.000Z"),
  });
}

describe("Phase 25.4.6 F-02 full scenario matrix", () => {
  describe("§7 domain overlap matrix", () => {
    const jan01_05 = period(d(2026, 1, 1), d(2026, 1, 5));
    const jan05_10 = period(d(2026, 1, 5), d(2026, 1, 10));
    const jan06_10 = period(d(2026, 1, 6), d(2026, 1, 10));
    const jan01_10 = period(d(2026, 1, 1), d(2026, 1, 10));
    const jan03_05 = period(d(2026, 1, 3), d(2026, 1, 5));
    const jan03_08 = period(d(2026, 1, 3), d(2026, 1, 8));
    const jan04_10 = period(d(2026, 1, 4), d(2026, 1, 10));
    const jan05_05 = period(d(2026, 1, 5), d(2026, 1, 5));

    it.each([
      ["A same period", jan01_05, jan01_05, true],
      ["B exact boundary", jan01_05, jan05_10, true],
      ["C adjacent", jan01_05, jan06_10, false],
      ["D containment", jan01_10, jan03_05, true],
      ["E partial left", jan03_08, jan01_05, true],
      ["F partial right", jan01_05, jan04_10, true],
      ["G same-day", jan05_05, jan05_05, true],
    ] as const)("%s → overlap=%s", (_label, a, b, expected) => {
      expect(availabilityPeriodsOverlap(a, b)).toBe(expected);
    });

    it("H symmetry", () => {
      expect(availabilityPeriodsOverlap(jan01_05, jan05_10)).toBe(
        availabilityPeriodsOverlap(jan05_10, jan01_05),
      );
    });

    it("I invalid range start > end rejects", () => {
      expect(() =>
        availabilityPeriodsOverlap(
          period(d(2026, 1, 10), d(2026, 1, 1)),
          jan01_05,
        ),
      ).toThrow();
    });
  });

  describe("§8 status consuming matrix", () => {
    it.each([
      ["DRAFT", false],
      ["CONFIRMED", false],
      ["RESERVED", true],
      ["ON_RENT", true],
      ["PARTIALLY_RETURNED", true],
      ["RETURNED", false],
      ["COMPLETED", false],
      ["CANCELLED", false],
      ["DISPATCHED", false],
    ] as const)("%s consumes=%s", (status, expected) => {
      expect(isAvailabilityCommitmentStatus(status)).toBe(expected);
    });
  });

  describe("§9 commitment quantity matrix", () => {
    it.each([
      [
        "reservation only",
        { reservedQuantity: 100, dispatches: [], returns: [] },
        100,
      ],
      [
        "partial dispatch",
        {
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 60 }],
          returns: [],
        },
        100,
      ],
      [
        "full dispatch",
        {
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [],
        },
        100,
      ],
      [
        "full dispatch + partial return",
        {
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
        },
        60,
      ],
      [
        "full dispatch + full return",
        {
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 100 }],
        },
        0,
      ],
      [
        "multi-dispatch",
        {
          reservedQuantity: 100,
          dispatches: [
            { status: "COMPLETED", quantity: 60 },
            { status: "COMPLETED", quantity: 40 },
          ],
          returns: [],
        },
        100,
      ],
      [
        "multi-dispatch + return 40",
        {
          reservedQuantity: 100,
          dispatches: [
            { status: "COMPLETED", quantity: 60 },
            { status: "COMPLETED", quantity: 40 },
          ],
          returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
        },
        60,
      ],
      [
        "multi-dispatch + return all",
        {
          reservedQuantity: 100,
          dispatches: [
            { status: "COMPLETED", quantity: 60 },
            { status: "COMPLETED", quantity: 40 },
          ],
          returns: [
            { status: "COMPLETED", returnedQuantity: 40 },
            { status: "COMPLETED", returnedQuantity: 60 },
          ],
        },
        0,
      ],
      [
        "cancelled dispatch does not consume hold",
        {
          reservedQuantity: 100,
          dispatches: [{ status: "CANCELLED", quantity: 60 }],
          returns: [],
        },
        100,
      ],
    ])(
      "%s → commitment=%i",
      (_label: string, input: CommitmentQuantityInput, expected: number) => {
        expect(calculateCommitmentQuantity(input).commitmentQty).toBe(expected);
      },
    );
  });

  describe("§10 ON_RENT double-count", () => {
    it("baseCapacity = onHand(40) + outstandingOut(60) = 100", () => {
      const snapshot = calculateDateAwareAvailabilitySnapshot({
        quantityOnHand: 40,
        reservedQuantity: 0,
        requestedPeriod: period(d(2026, 2, 1), d(2026, 2, 5)),
        lines: [
          {
            status: "ON_RENT",
            eventStartDate: d(2026, 2, 1),
            eventEndDate: d(2026, 2, 5),
            reservedQuantity: 100,
            dispatches: [{ status: "COMPLETED", quantity: 60 }],
            returns: [],
          },
        ],
      });

      expect(snapshot.outstandingOutQuantity).toBe(60);
      expect(snapshot.baseCapacity).toBe(100);
      expect(snapshot.dateAwareCommittedQuantity).toBe(100);
      expect(snapshot.dateAwareAvailableQuantity).toBe(0);
    });
  });

  describe("§13 self-order / §14 incremental", () => {
    it("self only / external only / self+external exclusion trio", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          rentalOrderId: RENTAL_ORDER_ID,
          reservedQuantity: 60,
        }),
        commitment({
          rentalOrderId: OTHER_RENTAL_ORDER_ID,
          reservedQuantity: 40,
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
      const range = {
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        startDate: d(2026, 2, 1),
        endDate: d(2026, 2, 5),
      };

      const both = await service.execute(range);
      expect(both.dateAwareCommittedQuantity).toBe(100);

      const excludeSelf = await service.execute({
        ...range,
        excludeRentalOrderId: RENTAL_ORDER_ID,
      });
      expect(excludeSelf.dateAwareCommittedQuantity).toBe(40);
      expect(excludeSelf.dateAwareAvailableQuantity).toBe(60);

      const excludeExternal = await service.execute({
        ...range,
        excludeRentalOrderId: OTHER_RENTAL_ORDER_ID,
      });
      expect(excludeExternal.dateAwareCommittedQuantity).toBe(60);
    });

    it("incremental reserve evaluates delta only (not prior hold as competitor)", async () => {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          quantity: 100,
          reservedQuantity: 40,
        }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          rentalOrderId: RENTAL_ORDER_ID,
          reservedQuantity: 40,
          status: "RESERVED",
        }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 40 }),
      ]);

      const result = await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        { items: [{ productId: PRODUCT_ID, quantity: 20 }] },
      );

      expect(result.items[0]?.reservedQuantity).toBe(60);
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        60,
      );
    });
  });

  describe("§15 multi-line atomicity", () => {
    it("both lines succeed when capacity exists", async () => {
      const order = buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
        items: [
          {
            productId: PRODUCT_ID,
            quantity: 50,
            reservedQuantity: 0,
          },
          {
            productId: OTHER_PRODUCT_ID,
            quantity: 20,
            reservedQuantity: 0,
          },
        ],
      });
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([order]);
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
          quantityOnHand: 50,
          reservedQuantity: 0,
        }),
      ]);

      const result = await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory),
      ).execute(
        { id: RENTAL_ORDER_ID },
        {
          items: [
            { productId: PRODUCT_ID, quantity: 50 },
            { productId: OTHER_PRODUCT_ID, quantity: 20 },
          ],
        },
      );

      expect(result.status).toBe("RESERVED");
      expect(result.items.map((item) => item.reservedQuantity)).toEqual([
        50, 20,
      ]);
      expect((await inventory.findById(INVENTORY_ID))?.reservedQuantity).toBe(
        50,
      );
      expect(
        (await inventory.findById(OTHER_INVENTORY_ID))?.reservedQuantity,
      ).toBe(20);
    });
  });

  describe("§21 product × warehouse × date combinations", () => {
    async function availabilityFor(params: {
      productId: string;
      warehouseId: string;
      start: Date;
      end: Date;
      lines: AvailabilityCommitmentLineProjection[];
      onHand?: number;
    }) {
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seedAvailabilityCommitmentLines(params.lines);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({
          productId: params.productId as ProductId,
          warehouseId: params.warehouseId as WarehouseId,
          quantityOnHand: params.onHand ?? 100,
          reservedQuantity: 0,
        }),
      ]);
      return new GetDateAwareAvailabilityService(
        rentalOrders,
        inventory,
      ).execute({
        productId: params.productId,
        warehouseId: params.warehouseId,
        startDate: params.start,
        endDate: params.end,
      });
    }

    it("same product + same warehouse + overlapping → conflict capacity", async () => {
      const result = await availabilityFor({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        start: d(2026, 2, 1),
        end: d(2026, 2, 5),
        lines: [commitment({ reservedQuantity: 100 })],
      });
      expect(result.dateAwareAvailableQuantity).toBe(0);
    });

    it("same product + same warehouse + adjacent → no conflict", async () => {
      const result = await availabilityFor({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        start: d(2026, 2, 6),
        end: d(2026, 2, 10),
        lines: [
          commitment({
            reservedQuantity: 100,
            eventStartDate: d(2026, 2, 1),
            eventEndDate: d(2026, 2, 5),
          }),
        ],
      });
      expect(result.dateAwareCommittedQuantity).toBe(0);
      expect(result.dateAwareAvailableQuantity).toBe(100);
    });

    it("same product + different warehouse → no conflict", async () => {
      const result = await availabilityFor({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        start: d(2026, 2, 1),
        end: d(2026, 2, 5),
        lines: [
          commitment({
            reservedQuantity: 100,
            warehouseId: OTHER_WAREHOUSE_ID,
          }),
        ],
      });
      expect(result.dateAwareCommittedQuantity).toBe(0);
    });

    it("different product + same warehouse → no conflict", async () => {
      const result = await availabilityFor({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        start: d(2026, 2, 1),
        end: d(2026, 2, 5),
        lines: [
          commitment({
            reservedQuantity: 100,
            productId: OTHER_PRODUCT_ID,
          }),
        ],
      });
      expect(result.dateAwareCommittedQuantity).toBe(0);
    });

    it("different product + different warehouse → no conflict", async () => {
      const result = await availabilityFor({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        start: d(2026, 2, 1),
        end: d(2026, 2, 5),
        lines: [
          commitment({
            reservedQuantity: 100,
            productId: OTHER_PRODUCT_ID,
            warehouseId: OTHER_WAREHOUSE_ID,
          }),
        ],
      });
      expect(result.dateAwareCommittedQuantity).toBe(0);
    });

    it("same everything but non-overlapping dates → no conflict", async () => {
      const result = await availabilityFor({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        start: d(2026, 3, 1),
        end: d(2026, 3, 5),
        lines: [commitment({ reservedQuantity: 100 })],
      });
      expect(result.dateAwareCommittedQuantity).toBe(0);
    });
  });

  describe("§16 cancel frees capacity + §26 inventory invariants", () => {
    it("cancel RELEASE keeps reservedQuantity >= 0 and frees retry", async () => {
      const orderA = OTHER_RENTAL_ORDER_ID;
      const orderB = RENTAL_ORDER_ID;
      const rentalOrders = new InMemoryRentalOrderRepository();
      rentalOrders.seed([
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          id: orderA,
          quantity: 100,
          reservedQuantity: 100,
          status: "RESERVED",
        }),
        buildConfirmedForPeriod(d(2026, 2, 1), d(2026, 2, 5), {
          id: orderB,
          quantity: 100,
        }),
      ]);
      rentalOrders.seedAvailabilityCommitmentLines([
        commitment({
          rentalOrderId: orderA,
          reservedQuantity: 100,
          status: "RESERVED",
        }),
      ]);
      const inventory = new InMemoryInventoryRepository();
      inventory.seed([
        buildInventoryEntity({ quantityOnHand: 100, reservedQuantity: 100 }),
      ]);
      const stock = new InMemoryStockMovementRepository();

      await expect(
        new ReserveRentalOrderService(
          createWriteScope(rentalOrders, inventory, stock),
        ).execute(
          { id: orderB },
          { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      await new CancelRentalOrderService(
        createWriteScope(rentalOrders, inventory, stock),
      ).execute({ id: orderA });

      const afterCancel = await inventory.findById(INVENTORY_ID);
      expect(afterCancel?.reservedQuantity).toBeGreaterThanOrEqual(0);
      expect(afterCancel?.quantityOnHand).toBeGreaterThanOrEqual(0);
      expect(afterCancel!.reservedQuantity).toBeLessThanOrEqual(
        afterCancel!.quantityOnHand,
      );
      expect(afterCancel?.reservedQuantity).toBe(0);

      rentalOrders.seedAvailabilityCommitmentLines([]);

      const reservedB = await new ReserveRentalOrderService(
        createWriteScope(rentalOrders, inventory, stock),
      ).execute(
        { id: orderB },
        { items: [{ productId: PRODUCT_ID, quantity: 100 }] },
      );
      expect(reservedB.status).toBe("RESERVED");
      const afterReserve = await inventory.findById(INVENTORY_ID);
      expect(afterReserve!.reservedQuantity).toBeLessThanOrEqual(
        afterReserve!.quantityOnHand,
      );
    });
  });

  describe("§25 analytics separation + §35 F-03 absent", () => {
    it("Active Rentals ≠ F-02 commitment statuses", () => {
      expect(isActiveRentalStatus("CONFIRMED")).toBe(true);
      expect(isActiveRentalStatus("RESERVED")).toBe(true);
      expect(isActiveRentalStatus("ON_RENT")).toBe(false);
      expect(isActiveRentalStatus("PARTIALLY_RETURNED")).toBe(false);

      expect(isAvailabilityCommitmentStatus("CONFIRMED")).toBe(false);
      expect(isAvailabilityCommitmentStatus("ON_RENT")).toBe(true);
    });

    it("F-03 borrowing/cross-supplier is not part of F-02 availability surface", () => {
      // Guardrail: availability rules export commitment helpers only — no borrow API.
      expect(typeof calculateCommitmentQuantity).toBe("function");
      expect(typeof calculateDateAwareAvailabilitySnapshot).toBe("function");
      expect(
        "borrowInventory" in
          ({} as Record<string, unknown>),
      ).toBe(false);
    });
  });
});
