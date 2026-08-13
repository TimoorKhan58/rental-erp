import { describe, expect, it, vi } from "vitest";

import { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import {
  AGREEMENT_ITEM_ID,
  buildExternalRentalAgreementEntity,
} from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import { createSeededExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { MockAuditLogger } from "@/modules/external-rental/tests/helpers/mock-audit-logger";
import { createPassThroughExternalRentalTransactionRunner } from "@/modules/external-rental/tests/helpers/transaction-test-runner";
import { buildInventoryEntity } from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import { buildSupplierEntity } from "@/modules/supplier/tests/helpers/supplier.fixtures";
import { InMemorySupplierRepository } from "@/modules/supplier/tests/helpers/in-memory-supplier.repository";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { ProductId, SupplierId } from "@/shared/domain/ids";

import { GetRentalOrderShortfallService } from "./services/get-rental-order-shortfall.service";
import { SourceRentalOrderExternallyService } from "./services/source-rental-order-externally.service";
import {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";

const SUPPLIER_ID = "aa0e8400-e29b-41d4-a716-446655440011" as SupplierId;
const OTHER_ITEM_ID = "dd0e8400-e29b-41d4-a716-446655440099";

function createNumberSequences(): INumberSequenceRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByDocumentType: vi.fn(),
    update: vi.fn(),
    generateNextNumber: vi.fn().mockResolvedValue({
      formattedNumber: "ERA-2026-SHORTFALL",
    }),
  } as unknown as INumberSequenceRepository;
}

function buildShortfallOrder(overrides?: {
  status?: "DRAFT" | "CONFIRMED" | "RESERVED" | "CANCELLED" | "DISPATCHED";
  quantity?: number;
}) {
  const quantity = overrides?.quantity ?? 500;

  return buildRentalOrderEntity({
    status: overrides?.status ?? "CONFIRMED",
    items: [
      {
        id: ITEM_ID,
        productId: PRODUCT_ID,
        quantity,
        dailyRate: 10,
        reservedQuantity: 0,
        startDate: new Date("2026-02-01T00:00:00.000Z"),
        endDate: new Date("2026-02-05T00:00:00.000Z"),
        numberOfDays: 5,
      },
    ],
  });
}

function createHarness(options?: {
  onHand?: number;
  reserved?: number;
  order?: ReturnType<typeof buildShortfallOrder>;
  seedActiveEra?: boolean;
}) {
  const order = options?.order ?? buildShortfallOrder();
  const rentalOrders = new InMemoryRentalOrderRepository();
  rentalOrders.seed([order]);

  const inventory = new InMemoryInventoryRepository();
  const inventoryEntity = buildInventoryEntity({
    quantityOnHand: options?.onHand ?? 300,
    reservedQuantity: options?.reserved ?? 0,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
  });
  inventory.seed([inventoryEntity]);
  const inventorySnapshot = {
    quantityOnHand: inventoryEntity.quantityOnHand,
    reservedQuantity: inventoryEntity.reservedQuantity,
  };

  const externalRentals = createSeededExternalRentalRepository(
    options?.seedActiveEra
      ? [
          buildExternalRentalAgreementEntity({
            rentalOrderId: RENTAL_ORDER_ID as never,
            warehouseId: WAREHOUSE_ID as never,
            items: [
              {
                id: AGREEMENT_ITEM_ID,
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
        ]
      : [],
  );

  const suppliers = new InMemorySupplierRepository();
  suppliers.seed([
    buildSupplierEntity({
      id: SUPPLIER_ID,
    }),
  ]);

  const auditLogger = new MockAuditLogger();
  const createExternalRental = new CreateExternalRentalService(
    createPassThroughExternalRentalTransactionRunner({
      externalRentalRepository: externalRentals,
      auditLogger,
      userId: USER_ID,
    }),
    createNumberSequences(),
    USER_ID,
  );

  const shortfallService = new GetRentalOrderShortfallService(
    rentalOrders,
    inventory,
    externalRentals,
  );

  const sourceService = new SourceRentalOrderExternallyService(
    rentalOrders,
    inventory,
    externalRentals,
    suppliers,
    createExternalRental,
  );

  return {
    inventory,
    inventorySnapshot,
    rentalOrders,
    auditLogger,
    shortfallService,
    sourceService,
  };
}

describe("GetRentalOrderShortfallService", () => {
  it("A: shortfall uses canonical F-02 date-aware availability", async () => {
    const { shortfallService } = createHarness({ onHand: 300 });

    const result = await shortfallService.execute({ id: RENTAL_ORDER_ID });

    expect(result.items[0]).toMatchObject({
      requiredQuantity: 500,
      ownedFulfillableQuantity: 300,
      dateAwareAvailableQuantity: 300,
      shortfallQuantity: 200,
      remainingShortfallQuantity: 200,
      canSourceExternally: true,
    });
    expect(result.canSourceExternally).toBe(true);
  });

  it("B: no shortage → canSourceExternally false", async () => {
    const { shortfallService } = createHarness({
      onHand: 600,
      order: buildShortfallOrder({ quantity: 500 }),
    });

    const result = await shortfallService.execute({ id: RENTAL_ORDER_ID });

    expect(result.items[0]?.shortfallQuantity).toBe(0);
    expect(result.items[0]?.canSourceExternally).toBe(false);
    expect(result.canSourceExternally).toBe(false);
  });
});

describe("SourceRentalOrderExternallyService", () => {
  it("C: full shortfall sourcing succeeds", async () => {
    const { sourceService, auditLogger, inventorySnapshot, inventory } =
      createHarness({ onHand: 300 });

    const result = await sourceService.execute(
      { id: RENTAL_ORDER_ID },
      {
        rentalOrderItemId: ITEM_ID,
        supplierId: SUPPLIER_ID,
        quantity: 200,
        unitCost: 25,
      },
    );

    expect(result.status).toBe("DRAFT");
    expect(result.rentalOrderId).toBe(RENTAL_ORDER_ID);
    expect(result.items[0]).toMatchObject({
      rentalOrderItemId: ITEM_ID,
      productId: PRODUCT_ID,
      quantityRequested: 200,
      unitCost: 25,
    });
    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");

    const after = await inventory.findByProductAndWarehouse(
      PRODUCT_ID,
      WAREHOUSE_ID,
    );
    expect(after?.quantityOnHand).toBe(inventorySnapshot.quantityOnHand);
    expect(after?.reservedQuantity).toBe(inventorySnapshot.reservedQuantity);
  });

  it("D: partial shortfall sourcing succeeds", async () => {
    const { sourceService } = createHarness({ onHand: 300 });

    const result = await sourceService.execute(
      { id: RENTAL_ORDER_ID },
      {
        rentalOrderItemId: ITEM_ID,
        supplierId: SUPPLIER_ID,
        quantity: 50,
        unitCost: 12.5,
      },
    );

    expect(result.items[0]?.quantityRequested).toBe(50);
    expect(result.items[0]?.unitCost).toBe(12.5);
  });

  it("E: over-shortfall rejected", async () => {
    const { sourceService } = createHarness({ onHand: 300 });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 201,
          unitCost: 25,
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /exceeds remaining shortfall/i.test(error.message),
    );
  });

  it("F: invalid quantity rejected", async () => {
    const { sourceService } = createHarness({ onHand: 300 });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 0,
          unitCost: 25,
        },
      ),
    ).rejects.toBeTruthy();
  });

  it("G: wrong rental order item rejected", async () => {
    const { sourceService } = createHarness({ onHand: 300 });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: OTHER_ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 50,
          unitCost: 25,
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /does not belong/i.test(error.message),
    );
  });

  it("H: invalid supplier rejected", async () => {
    const { sourceService } = createHarness({ onHand: 300 });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: "bb0e8400-e29b-41d4-a716-446655440099",
          quantity: 50,
          unitCost: 25,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("I: cancelled rental order rejected", async () => {
    const { sourceService } = createHarness({
      onHand: 300,
      order: buildShortfallOrder({ status: "CANCELLED" }),
    });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 50,
          unitCost: 25,
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /Cancelled rental order/i.test(error.message),
    );
  });

  it("J/K/L: ERA linkage, quantity, and unit cost correct", async () => {
    const { sourceService } = createHarness({ onHand: 300 });

    const result = await sourceService.execute(
      { id: RENTAL_ORDER_ID },
      {
        rentalOrderItemId: ITEM_ID,
        supplierId: SUPPLIER_ID,
        quantity: 100,
        unitCost: 33,
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.rentalOrderItemId).toBe(ITEM_ID);
    expect(result.items[0]?.productId).toBe(PRODUCT_ID);
    expect(result.items[0]?.quantityRequested).toBe(100);
    expect(result.items[0]?.unitCost).toBe(33);
    expect(result.warehouseId).toBe(WAREHOUSE_ID);
    expect(result.hireStartDate).toContain("2026-02-01");
    expect(result.hireEndDate).toContain("2026-02-05");
  });

  it("M/N: no inventory or F-02 capacity mutation", async () => {
    const { sourceService, inventory, inventorySnapshot, rentalOrders } =
      createHarness({ onHand: 300 });

    const beforeLines = await rentalOrders.findAvailabilityCommitmentLines({
      productId: PRODUCT_ID as ProductId,
      warehouseId: WAREHOUSE_ID,
    });

    await sourceService.execute(
      { id: RENTAL_ORDER_ID },
      {
        rentalOrderItemId: ITEM_ID,
        supplierId: SUPPLIER_ID,
        quantity: 100,
        unitCost: 25,
      },
    );

    const after = await inventory.findByProductAndWarehouse(
      PRODUCT_ID,
      WAREHOUSE_ID,
    );
    expect(after?.quantityOnHand).toBe(inventorySnapshot.quantityOnHand);
    expect(after?.reservedQuantity).toBe(inventorySnapshot.reservedQuantity);

    const afterLines = await rentalOrders.findAvailabilityCommitmentLines({
      productId: PRODUCT_ID as ProductId,
      warehouseId: WAREHOUSE_ID,
    });
    expect(afterLines).toEqual(beforeLines);
  });

  it("O: existing active ERA conflict handled", async () => {
    const { sourceService } = createHarness({
      onHand: 300,
      seedActiveEra: true,
    });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 50,
          unitCost: 25,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("P: audit emitted on create", async () => {
    const { sourceService, auditLogger } = createHarness({ onHand: 300 });

    await sourceService.execute(
      { id: RENTAL_ORDER_ID },
      {
        rentalOrderItemId: ITEM_ID,
        supplierId: SUPPLIER_ID,
        quantity: 75,
        unitCost: 20,
      },
    );

    expect(auditLogger.entries[0]).toMatchObject({
      action: "CREATE",
      status: "SUCCESS",
      module: "external-rentals",
    });
  });

  it("B-server: no shortage sourcing rejected", async () => {
    const { sourceService } = createHarness({ onHand: 600 });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 50,
          unitCost: 25,
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /No owned-inventory shortfall/i.test(error.message),
    );
  });

  it("rejects invalid lifecycle status", async () => {
    const { sourceService } = createHarness({
      onHand: 300,
      order: buildShortfallOrder({ status: "DISPATCHED" }),
    });

    await expect(
      sourceService.execute(
        { id: RENTAL_ORDER_ID },
        {
          rentalOrderItemId: ITEM_ID,
          supplierId: SUPPLIER_ID,
          quantity: 50,
          unitCost: 25,
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof UnprocessableError &&
        /current status/i.test(error.message),
    );
  });
});
