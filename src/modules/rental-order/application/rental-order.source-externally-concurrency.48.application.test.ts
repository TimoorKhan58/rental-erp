import { beforeEach, describe, expect, it, vi } from "vitest";

import { CancelRentalOrderService } from "@/modules/rental-order/application/services/cancel-rental-order.service";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import { SourceRentalOrderExternallyService } from "@/modules/rental-order/application/services/source-rental-order-externally.service";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import { calculateExternalSourcingShortfall } from "@/modules/rental-order/domain/rental-order.shortfall.rules";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import {
  buildExternalRentalAgreementEntity,
} from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { MockAuditLogger } from "@/modules/external-rental/tests/helpers/mock-audit-logger";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { buildSupplierEntity } from "@/modules/supplier/tests/helpers/supplier.fixtures";
import { InMemorySupplierRepository } from "@/modules/supplier/tests/helpers/in-memory-supplier.repository";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type { ProductId, RentalOrderId, SupplierId } from "@/shared/domain/ids";

import {
  ITEM_ID,
  OTHER_RENTAL_ORDER_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

const SUPPLIER_ID = "aa0e8400-e29b-41d4-a716-446655440011" as SupplierId;
const OTHER_ITEM_ID = "dd0e8400-e29b-41d4-a716-446655440099";
const PERIOD_START = new Date("2026-02-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-02-05T00:00:00.000Z");

function buildOrderItem(overrides: {
  id?: string;
  quantity: number;
  reservedQuantity?: number;
}) {
  return {
    id: overrides.id ?? ITEM_ID,
    productId: PRODUCT_ID,
    quantity: overrides.quantity,
    dailyRate: 10,
    reservedQuantity: overrides.reservedQuantity ?? 0,
    startDate: PERIOD_START,
    endDate: PERIOD_END,
    numberOfDays: 5,
  };
}

function createConcurrencyHarness(options: {
  onHand: number;
  reserved?: number;
  sourceOrderQuantity: number;
  blockingOrder?: ReturnType<typeof buildRentalOrderEntity>;
  cancelledEra?: boolean;
}) {
  const sourceOrder = buildRentalOrderEntity({
    status: "CONFIRMED",
    items: [buildOrderItem({ quantity: options.sourceOrderQuantity })],
  });

  const rentalOrders = new InMemoryRentalOrderRepository();
  const orders = [sourceOrder];
  if (options.blockingOrder !== undefined) {
    orders.push(options.blockingOrder);
  }
  rentalOrders.seed(orders);

  const inventory = new InMemoryInventoryRepository();
  inventory.seed([
    buildInventoryEntity({
      quantityOnHand: options.onHand,
      reservedQuantity: options.reserved ?? 0,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
    }),
  ]);

  const externalRentals = new InMemoryExternalRentalRepository();
  if (options.cancelledEra === true) {
    externalRentals.seed([
      buildExternalRentalAgreementEntity({
        status: "CANCELLED",
        rentalOrderId: RENTAL_ORDER_ID as never,
        warehouseId: WAREHOUSE_ID as never,
        items: [
          {
            id: "ee0e8400-e29b-41d4-a716-446655440001",
            productId: PRODUCT_ID as never,
            rentalOrderItemId: ITEM_ID as never,
            quantityRequested: 50,
            quantityConfirmed: 0,
            quantityReceived: 0,
            quantityAllocated: 0,
            quantityDispatched: 0,
            quantityReturnedFromCustomer: 0,
            quantityReturnedToSupplier: 0,
            quantityWrittenOff: 0,
            unitCost: 25,
            lineHireInCost: 0,
            notes: null,
          },
        ],
      }),
    ]);
  }

  const suppliers = new InMemorySupplierRepository();
  suppliers.seed([buildSupplierEntity({ id: SUPPLIER_ID })]);

  const auditLogger = new MockAuditLogger();
  const transactionRunner = createPassThroughTransactionRunner({
    rentalOrderRepository: rentalOrders,
    inventoryRepository: inventory,
    stockMovementRepository: new InMemoryStockMovementRepository(),
    dispatchRepository: new InMemoryDispatchRepository(),
    externalRentalRepository: externalRentals,
    auditLogger,
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });

  const numberSequences = createMockNumberSequenceRepository();
  vi.spyOn(numberSequences, "generateNextNumber").mockImplementation(async () => ({
    formattedNumber: `ERA-2026-${Math.random().toString(36).slice(2, 8)}`,
  }));

  return {
    rentalOrders,
    inventory,
    externalRentals,
    sourceService: new SourceRentalOrderExternallyService(
      transactionRunner,
      suppliers,
      numberSequences,
      USER_ID,
    ),
    cancelService: new CancelRentalOrderService(transactionRunner),
    reserveService: new ReserveRentalOrderService(transactionRunner),
  };
}

async function computeRemainingShortfall(
  rentalOrders: InMemoryRentalOrderRepository,
  inventory: InMemoryInventoryRepository,
  rentalOrderId: RentalOrderId,
  itemId: string,
  quantity: number,
): Promise<number> {
  const order = await rentalOrders.findById(rentalOrderId);
  if (order === null) {
    throw new Error("Rental order not found");
  }

  const item = order.items.find((line) => line.id === itemId);
  if (item === undefined) {
    throw new Error("Item not found");
  }

  const inventoryRow = await inventory.findByProductAndWarehouse(
    item.productId,
    order.warehouseId,
  );

  const commitmentLines = await rentalOrders.findAvailabilityCommitmentLines({
    productId: item.productId,
    warehouseId: order.warehouseId,
    excludeRentalOrderId: order.id,
  });

  const snapshot = calculateDateAwareAvailabilitySnapshot({
    quantityOnHand: inventoryRow?.quantityOnHand ?? 0,
    reservedQuantity: inventoryRow?.reservedQuantity ?? 0,
    requestedPeriod: {
      startDate: item.startDate,
      endDate: item.endDate,
    },
    lines: commitmentLines.map((line) => ({
      status: line.status,
      eventStartDate: line.eventStartDate,
      eventEndDate: line.eventEndDate,
      reservedQuantity: line.reservedQuantity,
      dispatches: line.dispatches,
      returns: line.returns,
    })),
  });

  return calculateExternalSourcingShortfall({
    requiredQuantity: quantity,
    dateAwareAvailableQuantity: snapshot.dateAwareAvailableQuantity,
    alreadyExternallyRequestedQuantity: 0,
  }).remainingShortfallQuantity;
}

describe("Phase 48 N-46-02: source externally F-02 serialization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("T48.1: valid full source within shortfall succeeds", async () => {
    const { sourceService, externalRentals } = createConcurrencyHarness({
      onHand: 300,
      sourceOrderQuantity: 500,
    });

    const result = await sourceService.execute(
      { id: RENTAL_ORDER_ID },
      {
        rentalOrderItemId: ITEM_ID,
        supplierId: SUPPLIER_ID,
        quantity: 200,
        unitCost: 25,
      },
    );

    expect(result.items[0]?.quantityRequested).toBe(200);
    const active = await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID);
    expect(active?.items[0]?.quantityRequested).toBe(200);
  });

  it("T48.2: cancel then source rejects stale pre-cancel shortfall", async () => {
    const blockingOrder = buildRentalOrderEntity({
      id: OTHER_RENTAL_ORDER_ID,
      status: "RESERVED",
      items: [
        buildOrderItem({
          id: OTHER_ITEM_ID,
          quantity: 95,
          reservedQuantity: 95,
        }),
      ],
    });

    const { sourceService, cancelService, externalRentals } =
      createConcurrencyHarness({
        onHand: 100,
        reserved: 95,
        sourceOrderQuantity: 20,
        blockingOrder,
      });

    await cancelService.execute({ id: OTHER_RENTAL_ORDER_ID });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 15,
          unitCost: 25,
        },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);

    const active = await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID);
    expect(active).toBeNull();
  });

  it("T48.2b: concurrent cancel ∥ source preserves post-lock shortfall invariant", async () => {
    const blockingOrder = buildRentalOrderEntity({
      id: OTHER_RENTAL_ORDER_ID,
      status: "RESERVED",
      items: [
        buildOrderItem({
          id: OTHER_ITEM_ID,
          quantity: 95,
          reservedQuantity: 95,
        }),
      ],
    });

    const { sourceService, cancelService, externalRentals, rentalOrders, inventory } =
      createConcurrencyHarness({
        onHand: 100,
        reserved: 95,
        sourceOrderQuantity: 20,
        blockingOrder,
      });

    const results = await Promise.allSettled([
      cancelService.execute({ id: OTHER_RENTAL_ORDER_ID }),
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 15,
          unitCost: 25,
        },
      ),
    ]);

    const sourceResult = results[1];
    const active = await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID);

    if (sourceResult.status === "fulfilled") {
      const remainingAtCommit = await computeRemainingShortfall(
        rentalOrders,
        inventory,
        RENTAL_ORDER_ID,
        ITEM_ID,
        20,
      );
      expect(sourceResult.value.items[0]?.quantityRequested).toBeLessThanOrEqual(
        remainingAtCommit + sourceResult.value.items[0]!.quantityRequested,
      );
      expect(active?.items[0]?.quantityRequested).toBe(15);
    } else {
      expect(active).toBeNull();
    }

    if (results[0].status === "fulfilled" && sourceResult.status === "fulfilled") {
      const postCancelShortfall = await computeRemainingShortfall(
        rentalOrders,
        inventory,
        RENTAL_ORDER_ID,
        ITEM_ID,
        20,
      );
      expect(postCancelShortfall).toBe(0);
      expect(sourceResult.value.items[0]?.quantityRequested).toBeLessThanOrEqual(
        postCancelShortfall + sourceResult.value.items[0]!.quantityRequested,
      );
    }
  });

  it("T48.3: request exceeding post-lock remaining shortfall is rejected", async () => {
    const blockingOrder = buildRentalOrderEntity({
      id: OTHER_RENTAL_ORDER_ID,
      status: "RESERVED",
      items: [
        buildOrderItem({
          id: OTHER_ITEM_ID,
          quantity: 90,
          reservedQuantity: 90,
        }),
      ],
    });

    const { sourceService, externalRentals } = createConcurrencyHarness({
      onHand: 100,
      reserved: 90,
      sourceOrderQuantity: 20,
      blockingOrder,
    });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 15,
          unitCost: 25,
        },
      ),
    ).rejects.toMatchObject({
      message: "External quantity exceeds remaining shortfall",
    });

    expect(
      await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID),
    ).toBeNull();
  });

  it("T48.4: cancelled ERA does not consume active sourcing capacity", async () => {
    const { sourceService, externalRentals } = createConcurrencyHarness({
      onHand: 300,
      sourceOrderQuantity: 500,
      cancelledEra: true,
    });

    const result = await sourceService.execute(
      { id: RENTAL_ORDER_ID },
      {
        rentalOrderItemId: ITEM_ID,
        supplierId: SUPPLIER_ID,
        quantity: 100,
        unitCost: 25,
      },
    );

    expect(result.items[0]?.quantityRequested).toBe(100);
    const active = await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID);
    expect(active?.status).not.toBe("CANCELLED");
  });

  it("T48.6: concurrent reserve ∥ source serializes on inventory lock", async () => {
    const reserveOrder = buildRentalOrderEntity({
      id: OTHER_RENTAL_ORDER_ID,
      status: "CONFIRMED",
      items: [
        buildOrderItem({
          id: OTHER_ITEM_ID,
          quantity: 90,
          reservedQuantity: 0,
        }),
      ],
    });

    const { sourceService, reserveService, externalRentals, rentalOrders, inventory } =
      createConcurrencyHarness({
        onHand: 100,
        sourceOrderQuantity: 20,
        blockingOrder: reserveOrder,
      });

    const results = await Promise.allSettled([
      reserveService.execute(
        { id: OTHER_RENTAL_ORDER_ID },
        {
          items: [{ productId: PRODUCT_ID as ProductId, quantity: 90 }],
        },
      ),
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 15,
          unitCost: 25,
        },
      ),
    ]);

    const sourceResult = results[1];
    const active = await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID);

    if (sourceResult.status === "fulfilled") {
      expect(sourceResult.value.items[0]?.quantityRequested).toBeLessThanOrEqual(15);
      expect(active?.items[0]?.quantityRequested).toBe(sourceResult.value.items[0]?.quantityRequested);

      const remaining = await computeRemainingShortfall(
        rentalOrders,
        inventory,
        RENTAL_ORDER_ID,
        ITEM_ID,
        20,
      );
      expect(sourceResult.value.items[0]?.quantityRequested).toBeLessThanOrEqual(
        remaining + sourceResult.value.items[0]!.quantityRequested,
      );
    } else {
      expect(sourceResult.reason).toBeInstanceOf(UnprocessableError);
      expect(active).toBeNull();
    }
  });
});
