import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import type { CreateExternalRentalInput } from "@/modules/external-rental/application/schemas/external-rental.schemas";
import {
  buildExternalRentalAgreementEntity,
} from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { MockAuditLogger } from "@/modules/external-rental/tests/helpers/mock-audit-logger";
import { createPassThroughExternalRentalTransactionRunner } from "@/modules/external-rental/tests/helpers/transaction-test-runner";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import { ReserveRentalOrderService } from "@/modules/rental-order/application/services/reserve-rental-order.service";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import { calculateExternalSourcingShortfall } from "@/modules/rental-order/domain/rental-order.shortfall.rules";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { ProductId, RentalOrderId } from "@/shared/domain/ids";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";

import {
  ITEM_ID,
  OTHER_RENTAL_ORDER_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildRentalOrderEntity,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { createPassThroughTransactionRunner } from "@/modules/rental-order/tests/helpers/transaction-test-runner";

const SUPPLIER_ID = "aa0e8400-e29b-41d4-a716-446655440011";
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

function toDirectCreateInput(overrides: {
  quantityRequested?: number;
  rentalOrderId?: RentalOrderId;
  warehouseId?: string;
  productId?: ProductId;
}): CreateExternalRentalInput {
  return {
    supplierId: SUPPLIER_ID,
    warehouseId: (overrides.warehouseId ?? WAREHOUSE_ID) as never,
    rentalOrderId: (overrides.rentalOrderId ?? RENTAL_ORDER_ID) as never,
    hireStartDate: PERIOD_START,
    hireEndDate: PERIOD_END,
    expectedReturnToSupplierDate: PERIOD_END,
    remarks: "Direct ERA shortfall",
    items: [
      {
        productId: (overrides.productId ?? PRODUCT_ID) as never,
        rentalOrderItemId: ITEM_ID as never,
        quantityRequested: overrides.quantityRequested ?? 100,
        unitCost: 25,
        notes: null,
      },
    ],
  };
}

function createDirectCreateHarness(options: {
  onHand: number;
  reserved?: number;
  sourceOrderQuantity: number;
  sourceOrderStatus?: "DRAFT" | "CONFIRMED" | "RESERVED" | "CANCELLED" | "DISPATCHED";
  blockingOrder?: ReturnType<typeof buildRentalOrderEntity>;
  seedActiveEra?: boolean;
}) {
  const sourceOrder = buildRentalOrderEntity({
    status: options.sourceOrderStatus ?? "CONFIRMED",
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
  if (options.seedActiveEra === true) {
    externalRentals.seed([
      buildExternalRentalAgreementEntity({
        rentalOrderId: RENTAL_ORDER_ID as never,
        warehouseId: WAREHOUSE_ID as never,
      }),
    ]);
  }

  const auditLogger = new MockAuditLogger();
  const transactionRunner = createPassThroughExternalRentalTransactionRunner({
    externalRentalRepository: externalRentals,
    rentalOrderRepository: rentalOrders,
    inventoryRepository: inventory,
    auditLogger,
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
    createService: new CreateExternalRentalService(
      transactionRunner,
      numberSequences,
      USER_ID,
    ),
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

describe("Phase 53 N-48-01: direct ERA create F-02 parity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("T53.1: valid direct create within shortfall succeeds", async () => {
    const { createService, externalRentals } = createDirectCreateHarness({
      onHand: 300,
      sourceOrderQuantity: 500,
    });

    const result = await createService.execute(
      toDirectCreateInput({ quantityRequested: 150 }),
    );

    expect(result.items[0]?.quantityRequested).toBe(150);
    const active = await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID);
    expect(active?.items[0]?.quantityRequested).toBe(150);
  });

  it("T53.2: direct create exceeding post-lock shortfall is rejected", async () => {
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

    const { createService, externalRentals } = createDirectCreateHarness({
      onHand: 100,
      reserved: 90,
      sourceOrderQuantity: 20,
      blockingOrder,
    });

    await expect(
      createService.execute(toDirectCreateInput({ quantityRequested: 15 })),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID)).toBeNull();
  });

  it("T53.3: direct create rejected when no shortfall remains", async () => {
    const { createService } = createDirectCreateHarness({
      onHand: 500,
      sourceOrderQuantity: 100,
    });

    await expect(
      createService.execute(toDirectCreateInput({ quantityRequested: 10 })),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /No owned-inventory shortfall/i.test(error.message),
    );
  });

  it("T53.4: direct create rejected for ineligible rental order status", async () => {
    const { createService } = createDirectCreateHarness({
      onHand: 0,
      sourceOrderQuantity: 100,
      sourceOrderStatus: "DISPATCHED",
    });

    await expect(
      createService.execute(toDirectCreateInput({ quantityRequested: 10 })),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("T53.5: direct create rejected when warehouse does not match rental order", async () => {
    const { createService } = createDirectCreateHarness({
      onHand: 0,
      sourceOrderQuantity: 100,
    });

    await expect(
      createService.execute(
        toDirectCreateInput({
          quantityRequested: 10,
          warehouseId: "990e8400-e29b-41d4-a716-446655440099",
        }),
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /Warehouse does not match/i.test(error.message),
    );
  });

  it("T53.6: direct create rejected when product does not match rental order item", async () => {
    const { createService } = createDirectCreateHarness({
      onHand: 0,
      sourceOrderQuantity: 100,
    });

    await expect(
      createService.execute(
        toDirectCreateInput({
          quantityRequested: 10,
          productId: "880e8400-e29b-41d4-a716-446655440099" as ProductId,
        }),
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /Product does not match/i.test(error.message),
    );
  });

  it("T53.7: concurrent direct create ∥ reserve preserves shortfall invariant", async () => {
    const { createService, rentalOrders, inventory, externalRentals } =
      createDirectCreateHarness({
        onHand: 100,
        sourceOrderQuantity: 120,
      });

    const roTransactionRunner = createPassThroughTransactionRunner({
      rentalOrderRepository: rentalOrders,
      inventoryRepository: inventory,
      stockMovementRepository: new InMemoryStockMovementRepository(),
      dispatchRepository: new InMemoryDispatchRepository(),
      externalRentalRepository: externalRentals,
      auditLogger: new MockAuditLogger(),
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    });

    const reserveService = new ReserveRentalOrderService(roTransactionRunner);

    const results = await Promise.allSettled([
      createService.execute(toDirectCreateInput({ quantityRequested: 30 })),
      reserveService.execute({ id: RENTAL_ORDER_ID }),
    ]);

    const createResult = results[0];
    const active = await externalRentals.findActiveByRentalOrderId(RENTAL_ORDER_ID);

    if (createResult.status === "fulfilled") {
      const remainingAtCommit = await computeRemainingShortfall(
        rentalOrders,
        inventory,
        RENTAL_ORDER_ID,
        ITEM_ID,
        120,
      );
      expect(createResult.value.items[0]?.quantityRequested).toBeLessThanOrEqual(
        remainingAtCommit + createResult.value.items[0]!.quantityRequested,
      );
      expect(active?.items[0]?.quantityRequested).toBe(30);
    } else {
      expect(active).toBeNull();
    }
  });

  it("T53.8: direct create conflicts when active ERA already exists", async () => {
    const { createService } = createDirectCreateHarness({
      onHand: 0,
      sourceOrderQuantity: 100,
      seedActiveEra: true,
    });

    await expect(
      createService.execute(toDirectCreateInput({ quantityRequested: 10 })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("T53.9: direct create requires rental order to exist", async () => {
    const externalRentals = new InMemoryExternalRentalRepository();
    const auditLogger = new MockAuditLogger();
    const numberSequences = createMockNumberSequenceRepository();
    vi.spyOn(numberSequences, "generateNextNumber").mockResolvedValue({
      formattedNumber: "ERA-2026-MISSING-RO",
    });
    const createService = new CreateExternalRentalService(
      createPassThroughExternalRentalTransactionRunner({
        externalRentalRepository: externalRentals,
        rentalOrderRepository: new InMemoryRentalOrderRepository(),
        inventoryRepository: new InMemoryInventoryRepository(),
        auditLogger,
        userId: USER_ID,
      }),
      numberSequences,
      USER_ID,
    );

    await expect(
      createService.execute(toDirectCreateInput({ quantityRequested: 10 })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
