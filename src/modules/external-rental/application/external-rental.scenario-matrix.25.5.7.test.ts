/**
 * Phase 25.5.7 — External rental scenario matrix (T1–T11).
 *
 * USER prompt numbering (not decision-doc table numbering).
 * Prefer TEST-ONLY; production untouched unless a locked rule breaks.
 */
import { describe, expect, it, vi } from "vitest";

import { AllocateExternalRentalService } from "@/modules/external-rental/application/services/allocate-external-rental.service";
import { ConfirmExternalRentalService } from "@/modules/external-rental/application/services/confirm-external-rental.service";
import { CreateExternalRentalService } from "@/modules/external-rental/application/services/create-external-rental.service";
import { ReceiveExternalRentalService } from "@/modules/external-rental/application/services/receive-external-rental.service";
import { SettleExternalRentalService } from "@/modules/external-rental/application/services/settle-external-rental.service";
import { SupplierReturnExternalRentalService } from "@/modules/external-rental/application/services/supplier-return-external-rental.service";
import type { CreateExternalRentalInput } from "@/modules/external-rental/application/schemas/external-rental.schemas";
import {
  assertQuantityPipelineInvariants,
  computeCustodyBalances,
  computeStatusAfterSupplierReturn,
  ExternalRentalAgreement,
} from "@/modules/external-rental/domain";
import {
  AGREEMENT_ID,
  AGREEMENT_ITEM_ID,
  SUPPLIER_ID,
  buildExternalRentalAgreementEntity,
} from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import {
  createSeededExternalRentalRepository,
  InMemoryExternalRentalRepository,
} from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { MockAuditLogger as EraMockAuditLogger } from "@/modules/external-rental/tests/helpers/mock-audit-logger";
import { createPassThroughExternalRentalTransactionRunner } from "@/modules/external-rental/tests/helpers/transaction-test-runner";

import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import { CreateDispatchService } from "@/modules/dispatch/application/services/create-dispatch.service";
import { UpdateDispatchService } from "@/modules/dispatch/application/services/update-dispatch.service";
import type { CreateDispatchInput } from "@/modules/dispatch/application/schemas/dispatch.schemas";
import {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger as DispatchMockAuditLogger } from "@/modules/dispatch/tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "@/modules/dispatch/tests/helpers/transaction-test-runner";

import {
  INVENTORY_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { Inventory } from "@/modules/inventory/domain/inventory.entity";

import {
  buildRentalOrderEntity,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import * as availabilityRules from "@/modules/rental-order/domain/rental-order.availability.rules";

import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
import { CreateReturnService } from "@/modules/return/application/services/create-return.service";
import { InspectReturnService } from "@/modules/return/application/services/inspect-return.service";
import { ReceiveReturnService } from "@/modules/return/application/services/receive-return.service";
import type { CreateReturnInput } from "@/modules/return/application/schemas/return.schemas";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { createPassThroughTransactionRunner as createReturnPassThrough } from "@/modules/return/tests/helpers/transaction-test-runner";

import { calculateInventoryValue } from "@/modules/reporting/domain/reporting.rules";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type { RentalOrderItemId, ExternalRentalAgreementId } from "@/shared/domain/ids";

const PURCHASE_COST = 40;
const UNIT_COST = 25;
const PERIOD = {
  startDate: new Date("2026-08-10T00:00:00.000Z"),
  endDate: new Date("2026-08-12T00:00:00.000Z"),
};

type PipelineItem = {
  quantityRequested: number;
  quantityConfirmed: number;
  quantityReceived: number;
  quantityAllocated: number;
  quantityDispatched: number;
  quantityReturnedFromCustomer: number;
  quantityReturnedToSupplier: number;
  quantityWrittenOff: number;
};

function assertCustody(item: PipelineItem) {
  const custody = computeCustodyBalances(item);
  expect(custody.qtyWithCustomer).toBe(
    item.quantityDispatched - item.quantityReturnedFromCustomer,
  );
  expect(custody.qtyInCompanyCustody).toBe(
    item.quantityReceived -
      item.quantityDispatched +
      item.quantityReturnedFromCustomer -
      item.quantityReturnedToSupplier -
      item.quantityWrittenOff,
  );
  expect(custody.qtyOwedToSupplier).toBe(
    item.quantityReceived -
      item.quantityReturnedToSupplier -
      item.quantityWrittenOff,
  );
  return custody;
}

function assertPipeline(item: PipelineItem) {
  expect(item.quantityConfirmed).toBeLessThanOrEqual(item.quantityRequested);
  expect(item.quantityReceived).toBeLessThanOrEqual(item.quantityConfirmed);
  expect(item.quantityAllocated).toBeLessThanOrEqual(item.quantityReceived);
  expect(item.quantityDispatched).toBeLessThanOrEqual(item.quantityAllocated);
  expect(item.quantityReturnedFromCustomer).toBeLessThanOrEqual(
    item.quantityDispatched,
  );
  expect(
    item.quantityReturnedToSupplier + item.quantityWrittenOff,
  ).toBeLessThanOrEqual(item.quantityReceived);
  expect(() => assertQuantityPipelineInvariants(item)).not.toThrow();
}

function snapshotOwned(inventory: Inventory | null | undefined) {
  return {
    quantityOnHand: inventory?.quantityOnHand ?? 0,
    reservedQuantity: inventory?.reservedQuantity ?? 0,
  };
}

function assertOwnedUnchanged(
  inventory: Inventory | null | undefined,
  baseline: { quantityOnHand: number; reservedQuantity: number },
) {
  expect(inventory?.quantityOnHand).toBe(baseline.quantityOnHand);
  expect(inventory?.reservedQuantity).toBe(baseline.reservedQuantity);
}

function inventoryValue(onHand: number, purchaseCost: number) {
  return calculateInventoryValue(onHand, purchaseCost);
}

function f02Available(
  onHand: number,
  reserved: number,
  period: { startDate: Date; endDate: Date } = PERIOD,
) {
  return calculateDateAwareAvailabilitySnapshot({
    quantityOnHand: onHand,
    reservedQuantity: reserved,
    requestedPeriod: period,
    lines: [],
  });
}

function createEraNumberSequences(): INumberSequenceRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByDocumentType: vi.fn(),
    update: vi.fn(),
    generateNextNumber: vi.fn().mockResolvedValue({
      formattedNumber: "ERA-2557-AUTO",
    }),
  } as unknown as INumberSequenceRepository;
}

function createEraHarness(
  agreements: ExternalRentalAgreement[] = [],
) {
  const repository =
    agreements.length > 0
      ? createSeededExternalRentalRepository(agreements)
      : createSeededExternalRentalRepository([]);
  const auditLogger = new EraMockAuditLogger();
  const runner = createPassThroughExternalRentalTransactionRunner({
    externalRentalRepository: repository,
    auditLogger,
    userId: USER_ID,
  });

  return {
    repository,
    auditLogger,
    create: new CreateExternalRentalService(
      runner,
      createEraNumberSequences(),
      USER_ID,
    ),
    confirm: new ConfirmExternalRentalService(runner),
    receive: new ReceiveExternalRentalService(runner),
    allocate: new AllocateExternalRentalService(runner),
    supplierReturn: new SupplierReturnExternalRentalService(runner),
    settle: new SettleExternalRentalService(runner),
  };
}

function createDispatchScope(options: {
  dispatchRepository: InMemoryDispatchRepository;
  rentalOrderRepository: InMemoryRentalOrderRepository;
  inventoryRepository: InMemoryInventoryRepository;
  stockMovementRepository: InMemoryStockMovementRepository;
  externalRentalRepository: InMemoryExternalRentalRepository;
}) {
  return createPassThroughTransactionRunner({
    dispatchRepository: options.dispatchRepository,
    rentalOrderRepository: options.rentalOrderRepository,
    inventoryRepository: options.inventoryRepository,
    stockMovementRepository: options.stockMovementRepository,
    externalRentalRepository: options.externalRentalRepository,
    auditLogger: new DispatchMockAuditLogger(),
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });
}

function createReturnScope(options: {
  returnRepository: InMemoryReturnRepository;
  dispatchRepository: InMemoryDispatchRepository;
  rentalOrderRepository: InMemoryRentalOrderRepository;
  inventoryRepository: InMemoryInventoryRepository;
  stockMovementRepository: InMemoryStockMovementRepository;
  externalRentalRepository: InMemoryExternalRentalRepository;
}) {
  return createReturnPassThrough({
    returnRepository: options.returnRepository,
    dispatchRepository: options.dispatchRepository,
    rentalOrderRepository: options.rentalOrderRepository,
    inventoryRepository: options.inventoryRepository,
    stockMovementRepository: options.stockMovementRepository,
    externalRentalRepository: options.externalRentalRepository,
    auditLogger: new DispatchMockAuditLogger(),
    ...mockNotificationWriteScopeDeps,
    userId: USER_ID,
  });
}

async function markDispatchReady(
  scope: ReturnType<typeof createDispatchScope>,
  id: string,
) {
  await new UpdateDispatchService(scope).execute({ id }, { markReady: true });
}

function buildOrder(options: {
  quantity: number;
  reservedQuantity: number;
  status?: "RESERVED" | "ON_RENT" | "CONFIRMED";
}) {
  return buildRentalOrderEntity({
    status: options.status ?? "RESERVED",
    reservedQuantity: options.reservedQuantity,
    items: [
      {
        id: ITEM_ID,
        productId: PRODUCT_ID,
        quantity: options.quantity,
        dailyRate: 150,
        reservedQuantity: options.reservedQuantity,
        startDate: new Date("2026-02-01T00:00:00.000Z"),
        endDate: new Date("2026-02-05T00:00:00.000Z"),
        numberOfDays: 5,
      },
    ],
  });
}

function buildAlignedAgreementItem(overrides: Partial<{
  quantityRequested: number;
  quantityConfirmed: number;
  quantityReceived: number;
  quantityAllocated: number;
  quantityDispatched: number;
  quantityReturnedFromCustomer: number;
  quantityReturnedToSupplier: number;
  quantityWrittenOff: number;
  unitCost: number;
  lineHireInCost: number;
}> = {}) {
  const qty = overrides.quantityRequested ?? 100;
  const received = overrides.quantityReceived ?? 0;
  const unitCost = overrides.unitCost ?? UNIT_COST;
  return {
    id: AGREEMENT_ITEM_ID,
    productId: PRODUCT_ID,
    rentalOrderItemId: ITEM_ID as RentalOrderItemId,
    quantityRequested: qty,
    quantityConfirmed: overrides.quantityConfirmed ?? 0,
    quantityReceived: received,
    quantityAllocated: overrides.quantityAllocated ?? 0,
    quantityDispatched: overrides.quantityDispatched ?? 0,
    quantityReturnedFromCustomer: overrides.quantityReturnedFromCustomer ?? 0,
    quantityReturnedToSupplier: overrides.quantityReturnedToSupplier ?? 0,
    quantityWrittenOff: overrides.quantityWrittenOff ?? 0,
    unitCost,
    lineHireInCost: overrides.lineHireInCost ?? received * unitCost,
    notes: null,
  };
}

function seedAlignedEra(overrides: {
  status?: ExternalRentalAgreement["status"];
  settlementStatus?: ExternalRentalAgreement["settlementStatus"];
  totalHireInCost?: number;
  amountDue?: number;
  amountPaid?: number;
  item?: Parameters<typeof buildAlignedAgreementItem>[0];
} = {}) {
  const item = buildAlignedAgreementItem(overrides.item);
  return buildExternalRentalAgreementEntity({
    id: AGREEMENT_ID,
    rentalOrderId: RENTAL_ORDER_ID,
    warehouseId: WAREHOUSE_ID,
    status: overrides.status ?? "DRAFT",
    settlementStatus: overrides.settlementStatus ?? "UNSETTLED",
    totalHireInCost: overrides.totalHireInCost ?? item.lineHireInCost,
    amountDue: overrides.amountDue ?? item.lineHireInCost,
    amountPaid: overrides.amountPaid ?? 0,
    items: [item],
  });
}

function toCreateInput(quantity = 100): CreateExternalRentalInput {
  return {
    agreementNumber: "ERA-2557-T1",
    supplierId: SUPPLIER_ID,
    warehouseId: WAREHOUSE_ID,
    rentalOrderId: RENTAL_ORDER_ID,
    hireStartDate: new Date("2026-08-10T00:00:00.000Z"),
    hireEndDate: new Date("2026-08-12T00:00:00.000Z"),
    expectedReturnToSupplierDate: new Date("2026-08-13T00:00:00.000Z"),
    remarks: "Phase 25.5.7 T1",
    items: [
      {
        productId: PRODUCT_ID,
        rentalOrderItemId: ITEM_ID,
        quantityRequested: quantity,
        unitCost: UNIT_COST,
        notes: null,
      },
    ],
  } as CreateExternalRentalInput;
}

async function listMovementTypes(
  stockMovementRepository: InMemoryStockMovementRepository,
) {
  const page = await stockMovementRepository.findPaged({
    page: 1,
    pageSize: 50,
    sortOrder: "desc",
  });
  return page.items.map((m) => m.movementType).sort();
}

async function completeCustomerReturn(options: {
  returnScope: ReturnType<typeof createReturnScope>;
  rentalOrderId: string;
  dispatchId: string;
  quantity: number;
  ownedQuantity: number;
  externalQuantity: number;
  returnNumber: string;
}) {
  const createReturn = new CreateReturnService(
    options.returnScope,
    createMockNumberSequenceRepository(),
  );
  const receiveReturn = new ReceiveReturnService(options.returnScope);
  const inspectReturn = new InspectReturnService(options.returnScope);
  const completeReturn = new CompleteReturnService(options.returnScope);

  const ret = await createReturn.execute({
    returnNumber: options.returnNumber,
    rentalOrderId: options.rentalOrderId,
    dispatchId: options.dispatchId,
    returnDate: new Date("2026-02-10T00:00:00.000Z"),
    items: [
      {
        rentalOrderItemId: ITEM_ID,
        quantity: options.quantity,
        ownedQuantity: options.ownedQuantity,
        externalQuantity: options.externalQuantity,
      },
    ],
  } as CreateReturnInput);

  await receiveReturn.execute({ id: ret.id });
  const mixed =
    options.ownedQuantity > 0 && options.externalQuantity > 0;
  await inspectReturn.execute(
    { id: ret.id },
    {
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          goodQuantity: options.quantity,
          damagedQuantity: 0,
          lostQuantity: 0,
          missingQuantity: 0,
          ...(mixed
            ? {
                ownedGoodQuantity: options.ownedQuantity,
                ownedDamagedQuantity: 0,
                ownedLostQuantity: 0,
                externalGoodQuantity: options.externalQuantity,
                externalDamagedQuantity: 0,
                externalLostQuantity: 0,
              }
            : {}),
        },
      ],
    },
  );
  return completeReturn.execute({ id: ret.id });
}

describe("Phase 25.5.7 external rental scenario matrix", () => {
  describe("T1 — Full external-only lifecycle", () => {
    it("runs create→confirm→receive→allocate→dispatch→customer return→supplier return→settle without inventory mutation", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 300,
          reservedQuantity: 0,
        }),
      ]);
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildOrder({ quantity: 100, reservedQuantity: 0 }),
      ]);
      const dispatchRepository = new InMemoryDispatchRepository();
      const returnRepository = new InMemoryReturnRepository();

      const era = createEraHarness([]);
      const baseline = snapshotOwned(
        await inventoryRepository.findById(INVENTORY_ID),
      );

      const created = await era.create.execute(toCreateInput(100));
      expect(created.status).toBe("DRAFT");
      expect(stockMovementRepository.count()).toBe(0);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );

      const confirmed = await era.confirm.execute({ id: created.id });
      expect(confirmed.status).toBe("CONFIRMED");
      expect(confirmed.items[0].quantityConfirmed).toBe(100);
      expect(stockMovementRepository.count()).toBe(0);

      const received = await era.receive.execute(
        { id: created.id },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 100 }] },
      );
      expect(received.status).toBe("RECEIVED");
      expect(received.items[0].quantityReceived).toBe(100);
      expect(received.totalHireInCost).toBe(100 * UNIT_COST);
      assertPipeline(received.items[0]);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );
      expect(stockMovementRepository.count()).toBe(0);

      const allocated = await era.allocate.execute(
        { id: created.id },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 100 }] },
      );
      expect(allocated.status).toBe("ALLOCATED");
      expect(allocated.items[0].quantityAllocated).toBe(100);
      const orderAfterAllocate = await rentalOrderRepository.findById(
        RENTAL_ORDER_ID,
      );
      expect(orderAfterAllocate?.items[0]?.reservedQuantity).toBe(0);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );

      const dispatchScope = createDispatchScope({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository: era.repository,
      });
      const createDispatch = new CreateDispatchService(
        dispatchScope,
        createMockNumberSequenceRepository(),
      );
      const completeDispatch = new CompleteDispatchService(dispatchScope);

      const dispatch = await createDispatch.execute({
        dispatchNumber: "DSP-2557-T1",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 100,
            ownedQuantity: 0,
            externalQuantity: 100,
          },
        ],
      } as CreateDispatchInput);
      await markDispatchReady(dispatchScope, dispatch.id);
      const dispatched = await completeDispatch.execute({ id: dispatch.id });
      expect(dispatched.status).toBe("COMPLETED");

      const agreementInUse = await era.repository.findById(
        created.id as ExternalRentalAgreementId,
      );
      expect(agreementInUse?.status).toBe("IN_USE");
      expect(agreementInUse?.items[0].quantityDispatched).toBe(100);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );
      expect(stockMovementRepository.count()).toBe(0);

      const returnScope = createReturnScope({
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository: era.repository,
      });
      await completeCustomerReturn({
        returnScope,
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchId: dispatch.id,
        quantity: 100,
        ownedQuantity: 0,
        externalQuantity: 100,
        returnNumber: "RTN-2557-T1",
      });

      const afterCustomerReturn = await era.repository.findById(
        created.id as ExternalRentalAgreementId,
      );
      expect(afterCustomerReturn?.status).toBe("RETURN_PENDING");
      expect(afterCustomerReturn?.items[0].quantityReturnedFromCustomer).toBe(
        100,
      );
      expect(afterCustomerReturn?.items[0].quantityReturnedToSupplier).toBe(0);
      assertCustody(afterCustomerReturn!.items[0]);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );
      expect(stockMovementRepository.count()).toBe(0);

      const supplierReturned = await era.supplierReturn.execute(
        { id: created.id },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 100 }] },
      );
      expect(supplierReturned.status).toBe("RETURNED");
      expect(supplierReturned.items[0].quantityReturnedToSupplier).toBe(100);

      const settled = await era.settle.execute(
        { id: created.id },
        { paymentAmount: 100 * UNIT_COST },
      );
      expect(settled.settlementStatus).toBe("SETTLED");
      expect(settled.status).toBe("RETURNED");

      const finalItem = settled.items[0];
      const custody = assertCustody(finalItem);
      expect(custody.qtyWithCustomer).toBe(0);
      expect(custody.qtyInCompanyCustody).toBe(0);
      expect(custody.qtyOwedToSupplier).toBe(0);
      assertPipeline(finalItem);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );
      expect(stockMovementRepository.count()).toBe(0);

      expect(era.auditLogger.entries.length).toBeGreaterThanOrEqual(6);
      expect(era.auditLogger.entries.map((e) => e.action)).toEqual(
        expect.arrayContaining([
          "CREATE",
          "APPROVE",
          "UPDATE",
          "UPDATE",
          "UPDATE",
          "UPDATE",
        ]),
      );
      expect(
        era.auditLogger.entries.filter((e) => e.action === "APPROVE"),
      ).toHaveLength(1);
      expect(
        era.auditLogger.entries.filter((e) => e.action === "CREATE"),
      ).toHaveLength(1);
    });
  });

  describe("T2 — Owned-only F-01 regression", () => {
    it("owned-only dispatch mutates inventory and RELEASE reduces reserved; owned return IN restocks", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildOrder({ quantity: 10, reservedQuantity: 10 }),
      ]);
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
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const externalRentalRepository = new InMemoryExternalRentalRepository();
      const returnRepository = new InMemoryReturnRepository();

      const dispatchScope = createDispatchScope({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository,
      });
      const createDispatch = new CreateDispatchService(
        dispatchScope,
        createMockNumberSequenceRepository(),
      );
      const completeDispatch = new CompleteDispatchService(dispatchScope);

      const dispatch = await createDispatch.execute({
        dispatchNumber: "DSP-2557-T2",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
          },
        ],
      } as CreateDispatchInput);

      await markDispatchReady(dispatchScope, dispatch.id);
      await completeDispatch.execute({ id: dispatch.id });

      const afterDispatch = await inventoryRepository.findById(INVENTORY_ID);
      expect(afterDispatch?.quantityOnHand).toBe(45);
      // F-01: RELEASE reduces inventory.reservedQuantity (not order-line counter).
      expect(afterDispatch?.reservedQuantity).toBe(5);
      expect(stockMovementRepository.count()).toBe(2);
      expect(await listMovementTypes(stockMovementRepository)).toEqual([
        "OUT",
        "RELEASE",
      ]);

      const orderAfterDispatch = await rentalOrderRepository.findById(
        RENTAL_ORDER_ID,
      );
      // Order-line reservedQuantity remains the F-01 commitment (unchanged by dispatch).
      expect(orderAfterDispatch?.items[0]?.reservedQuantity).toBe(10);

      const returnScope = createReturnScope({
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository,
      });
      await completeCustomerReturn({
        returnScope,
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchId: dispatch.id,
        quantity: 5,
        ownedQuantity: 5,
        externalQuantity: 0,
        returnNumber: "RTN-2557-T2",
      });

      const afterReturn = await inventoryRepository.findById(INVENTORY_ID);
      expect(afterReturn?.quantityOnHand).toBe(50);
      const types = await listMovementTypes(stockMovementRepository);
      expect(types).toContain("IN");
    });
  });

  describe("T3 — Mixed owned+external dispatch", () => {
    it("dispatch 60 owned + 40 external updates inventory and ERA correctly", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildOrder({ quantity: 100, reservedQuantity: 60 }),
      ]);
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 200,
          reservedQuantity: 60,
        }),
      ]);
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const externalRentalRepository = createSeededExternalRentalRepository([
        seedAlignedEra({
          status: "ALLOCATED",
          item: {
            quantityRequested: 40,
            quantityConfirmed: 40,
            quantityReceived: 40,
            quantityAllocated: 40,
            lineHireInCost: 40 * UNIT_COST,
          },
        }),
      ]);

      const scope = createDispatchScope({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository,
      });
      const createDispatch = new CreateDispatchService(
        scope,
        createMockNumberSequenceRepository(),
      );
      const completeDispatch = new CompleteDispatchService(scope);

      const dispatch = await createDispatch.execute({
        dispatchNumber: "DSP-2557-T3",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 100,
            ownedQuantity: 60,
            externalQuantity: 40,
          },
        ],
      } as CreateDispatchInput);

      await markDispatchReady(scope, dispatch.id);
      await completeDispatch.execute({ id: dispatch.id });

      const inventory = await inventoryRepository.findById(INVENTORY_ID);
      expect(inventory?.quantityOnHand).toBe(140);
      expect(await listMovementTypes(stockMovementRepository)).toEqual([
        "OUT",
        "RELEASE",
      ]);
      expect(stockMovementRepository.count()).toBe(2);

      const agreement = await externalRentalRepository.findById(AGREEMENT_ID);
      expect(agreement?.items[0].quantityDispatched).toBe(40);
      expect(agreement?.status).toBe("IN_USE");

      // Owned RELEASE cleared inventory reservation; order-line reserved stays F-01 commitment.
      expect(inventory?.reservedQuantity).toBe(0);
      const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
      expect(order?.items[0]?.reservedQuantity).toBe(60);
    });
  });

  describe("T4 — Mixed owned+external return", () => {
    it("owned IN restocks; external increments customerReturned only; custody owed=40", async () => {
      const dispatchRepository = new InMemoryDispatchRepository();
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildOrder({ quantity: 100, reservedQuantity: 60 }),
      ]);
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 200,
          reservedQuantity: 60,
        }),
      ]);
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const externalRentalRepository = createSeededExternalRentalRepository([
        seedAlignedEra({
          status: "ALLOCATED",
          item: {
            quantityRequested: 40,
            quantityConfirmed: 40,
            quantityReceived: 40,
            quantityAllocated: 40,
            lineHireInCost: 40 * UNIT_COST,
          },
        }),
      ]);
      const returnRepository = new InMemoryReturnRepository();

      const dispatchScope = createDispatchScope({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository,
      });
      const createDispatch = new CreateDispatchService(
        dispatchScope,
        createMockNumberSequenceRepository(),
      );
      const completeDispatch = new CompleteDispatchService(dispatchScope);

      const dispatch = await createDispatch.execute({
        dispatchNumber: "DSP-2557-T4",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 100,
            ownedQuantity: 60,
            externalQuantity: 40,
          },
        ],
      } as CreateDispatchInput);
      await markDispatchReady(dispatchScope, dispatch.id);
      await completeDispatch.execute({ id: dispatch.id });

      const onHandAfterDispatch = (
        await inventoryRepository.findById(INVENTORY_ID)
      )?.quantityOnHand;
      expect(onHandAfterDispatch).toBe(140);

      const returnScope = createReturnScope({
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository,
      });
      await completeCustomerReturn({
        returnScope,
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchId: dispatch.id,
        quantity: 100,
        ownedQuantity: 60,
        externalQuantity: 40,
        returnNumber: "RTN-2557-T4",
      });

      const inventory = await inventoryRepository.findById(INVENTORY_ID);
      expect(inventory?.quantityOnHand).toBe(200);
      const types = await listMovementTypes(stockMovementRepository);
      expect(types).toContain("IN");

      const agreement = await externalRentalRepository.findById(AGREEMENT_ID);
      expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(40);
      expect(agreement?.items[0].quantityReturnedToSupplier).toBe(0);
      const custody = assertCustody(agreement!.items[0]);
      expect(custody.qtyWithCustomer).toBe(0);
      expect(custody.qtyInCompanyCustody).toBe(40);
      expect(custody.qtyOwedToSupplier).toBe(40);
      expect(agreement?.status).toBe("RETURN_PENDING");
    });
  });

  describe("T5 — Partial external receive", () => {
    it("partial receive, rejects over-receive/over-allocate, then completes receive", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 300,
          reservedQuantity: 0,
        }),
      ]);
      const baseline = snapshotOwned(
        await inventoryRepository.findById(INVENTORY_ID),
      );

      const era = createEraHarness([
        seedAlignedEra({
          status: "DRAFT",
          item: { quantityRequested: 100 },
        }),
      ]);

      await era.confirm.execute({ id: AGREEMENT_ID });
      const partial = await era.receive.execute(
        { id: AGREEMENT_ID },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 40 }] },
      );
      expect(partial.status).toBe("PARTIALLY_RECEIVED");
      expect(partial.items[0].quantityReceived).toBe(40);
      expect(partial.totalHireInCost).toBe(40 * UNIT_COST);

      await expect(
        era.allocate.execute(
          { id: AGREEMENT_ID },
          { items: [{ rentalOrderItemId: ITEM_ID, quantity: 41 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      await expect(
        era.receive.execute(
          { id: AGREEMENT_ID },
          { items: [{ rentalOrderItemId: ITEM_ID, quantity: 61 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const full = await era.receive.execute(
        { id: AGREEMENT_ID },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 60 }] },
      );
      expect(full.status).toBe("RECEIVED");
      expect(full.items[0].quantityReceived).toBe(100);
      assertPipeline(full.items[0]);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );
    });
  });

  describe("T6 — Partial external allocation", () => {
    it("partial allocate, rejects over-allocate/over-dispatch, then completes allocate", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 300,
          reservedQuantity: 0,
        }),
      ]);
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildOrder({ quantity: 100, reservedQuantity: 0 }),
      ]);
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const baseline = snapshotOwned(
        await inventoryRepository.findById(INVENTORY_ID),
      );

      const era = createEraHarness([
        seedAlignedEra({
          status: "RECEIVED",
          amountDue: 100 * UNIT_COST,
          totalHireInCost: 100 * UNIT_COST,
          item: {
            quantityRequested: 100,
            quantityConfirmed: 100,
            quantityReceived: 100,
            quantityAllocated: 0,
            lineHireInCost: 100 * UNIT_COST,
          },
        }),
      ]);

      const partial = await era.allocate.execute(
        { id: AGREEMENT_ID },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 40 }] },
      );
      expect(partial.items[0].quantityAllocated).toBe(40);
      expect(partial.status).toBe("RECEIVED");

      await expect(
        era.allocate.execute(
          { id: AGREEMENT_ID },
          { items: [{ rentalOrderItemId: ITEM_ID, quantity: 61 }] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const dispatchRepository = new InMemoryDispatchRepository();
      const dispatchScope = createDispatchScope({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository: era.repository,
      });
      const createDispatch = new CreateDispatchService(
        dispatchScope,
        createMockNumberSequenceRepository(),
      );

      await expect(
        createDispatch.execute({
          dispatchNumber: "DSP-2557-T6-OVER",
          rentalOrderId: RENTAL_ORDER_ID,
          dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
          deliveryMethod: "DELIVERY",
          deliveryAddress: "Venue",
          items: [
            {
              productId: PRODUCT_ID,
              rentalOrderItemId: ITEM_ID,
              quantity: 41,
              ownedQuantity: 0,
              externalQuantity: 41,
            },
          ],
        } as CreateDispatchInput),
      ).rejects.toBeInstanceOf(UnprocessableError);

      const full = await era.allocate.execute(
        { id: AGREEMENT_ID },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 60 }] },
      );
      expect(full.items[0].quantityAllocated).toBe(100);
      expect(full.status).toBe("ALLOCATED");

      const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
      expect(order?.items[0]?.reservedQuantity).toBe(0);
      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );
    });
  });

  describe("T7 — Customer return before supplier return (custody: customerReturned≠supplierReturned)", () => {
    it("after customer return: company custody + owed; status RETURN_PENDING", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 300,
          reservedQuantity: 0,
        }),
      ]);
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildOrder({ quantity: 100, reservedQuantity: 0 }),
      ]);
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const dispatchRepository = new InMemoryDispatchRepository();
      const returnRepository = new InMemoryReturnRepository();

      const era = createEraHarness([
        seedAlignedEra({
          status: "ALLOCATED",
          amountDue: 100 * UNIT_COST,
          totalHireInCost: 100 * UNIT_COST,
          item: {
            quantityRequested: 100,
            quantityConfirmed: 100,
            quantityReceived: 100,
            quantityAllocated: 100,
            lineHireInCost: 100 * UNIT_COST,
          },
        }),
      ]);

      const dispatchScope = createDispatchScope({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository: era.repository,
      });
      const createDispatch = new CreateDispatchService(
        dispatchScope,
        createMockNumberSequenceRepository(),
      );
      const completeDispatch = new CompleteDispatchService(dispatchScope);

      const dispatch = await createDispatch.execute({
        dispatchNumber: "DSP-2557-T7",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 100,
            ownedQuantity: 0,
            externalQuantity: 100,
          },
        ],
      } as CreateDispatchInput);
      await markDispatchReady(dispatchScope, dispatch.id);
      await completeDispatch.execute({ id: dispatch.id });

      const returnScope = createReturnScope({
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository: era.repository,
      });
      await completeCustomerReturn({
        returnScope,
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchId: dispatch.id,
        quantity: 100,
        ownedQuantity: 0,
        externalQuantity: 100,
        returnNumber: "RTN-2557-T7",
      });

      const agreement = await era.repository.findById(AGREEMENT_ID);
      expect(agreement?.items[0].quantityReceived).toBe(100);
      expect(agreement?.items[0].quantityDispatched).toBe(100);
      expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(100);
      expect(agreement?.items[0].quantityReturnedToSupplier).toBe(0);
      expect(agreement?.status).toBe("RETURN_PENDING");
      expect(agreement?.status).not.toBe("RETURNED");

      const custody = assertCustody(agreement!.items[0]);
      expect(custody.qtyWithCustomer).toBe(0);
      expect(custody.qtyInCompanyCustody).toBe(100);
      expect(custody.qtyOwedToSupplier).toBe(100);
      // Supplier return still required to reach RETURNED / clear owed.
      expect(agreement?.items[0].quantityReturnedToSupplier).toBe(0);
    });
  });

  describe("T8 — Partial supplier return", () => {
    it("partial then full supplier return clears custody to RETURNED", async () => {
      const era = createEraHarness([
        seedAlignedEra({
          status: "RETURN_PENDING",
          amountDue: 100 * UNIT_COST,
          totalHireInCost: 100 * UNIT_COST,
          item: {
            quantityRequested: 100,
            quantityConfirmed: 100,
            quantityReceived: 100,
            quantityAllocated: 100,
            quantityDispatched: 100,
            quantityReturnedFromCustomer: 100,
            quantityReturnedToSupplier: 0,
            lineHireInCost: 100 * UNIT_COST,
          },
        }),
      ]);

      const first = await era.supplierReturn.execute(
        { id: AGREEMENT_ID },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 40 }] },
      );
      expect(first.items[0].quantityReturnedToSupplier).toBe(40);
      expect(first.status).toBe("RETURN_PENDING");
      const custody40 = assertCustody(first.items[0]);
      expect(custody40.qtyInCompanyCustody).toBe(60);
      expect(custody40.qtyOwedToSupplier).toBe(60);

      const second = await era.supplierReturn.execute(
        { id: AGREEMENT_ID },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: 60 }] },
      );
      expect(second.status).toBe("RETURNED");
      expect(second.items[0].quantityReturnedToSupplier).toBe(100);
      const custody0 = assertCustody(second.items[0]);
      expect(custody0.qtyInCompanyCustody).toBe(0);
      expect(custody0.qtyOwedToSupplier).toBe(0);
    });
  });

  describe("T9 — Write-off/custody boundary via reconstitution (NO write-off service)", () => {
    it("reconstituted writtenOff closes owed/custody without inventory mutation", async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 300,
          reservedQuantity: 0,
        }),
      ]);
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const baseline = snapshotOwned(
        await inventoryRepository.findById(INVENTORY_ID),
      );
      const valueBaseline = inventoryValue(baseline.quantityOnHand, PURCHASE_COST);

      const item = buildAlignedAgreementItem({
        quantityRequested: 100,
        quantityConfirmed: 100,
        quantityReceived: 100,
        quantityAllocated: 100,
        quantityDispatched: 0,
        quantityReturnedFromCustomer: 0,
        quantityReturnedToSupplier: 80,
        quantityWrittenOff: 20,
        lineHireInCost: 100 * UNIT_COST,
      });

      expect(() => assertQuantityPipelineInvariants(item)).not.toThrow();
      const custody = assertCustody(item);
      expect(custody.qtyOwedToSupplier).toBe(0);
      expect(custody.qtyInCompanyCustody).toBe(0);
      expect(custody.qtyWithCustomer).toBe(0);

      const status = computeStatusAfterSupplierReturn([item]);
      expect(status).toBe("RETURNED");

      const agreement = ExternalRentalAgreement.reconstitute({
        ...seedAlignedEra({
          status: "RETURNED",
          amountDue: 100 * UNIT_COST,
          totalHireInCost: 100 * UNIT_COST,
          item,
        }).toProps(),
        status: "RETURNED",
        items: [item],
      });
      expect(agreement.status).toBe("RETURNED");
      assertPipeline(agreement.items[0]);

      assertOwnedUnchanged(
        await inventoryRepository.findById(INVENTORY_ID),
        baseline,
      );
      expect(
        inventoryValue(
          (await inventoryRepository.findById(INVENTORY_ID))!.quantityOnHand,
          PURCHASE_COST,
        ),
      ).toBe(valueBaseline);
      expect(stockMovementRepository.count()).toBe(0);
    });
  });

  describe("T10 — Settlement orthogonal to operational status", () => {
    it("Case A: RETURNED + UNSETTLED then settle; Case B: settle while operational incomplete; reject overpay", async () => {
      const returnedUnsettled = seedAlignedEra({
        status: "RETURNED",
        settlementStatus: "UNSETTLED",
        amountDue: 100 * UNIT_COST,
        amountPaid: 0,
        totalHireInCost: 100 * UNIT_COST,
        item: {
          quantityRequested: 100,
          quantityConfirmed: 100,
          quantityReceived: 100,
          quantityAllocated: 100,
          quantityDispatched: 100,
          quantityReturnedFromCustomer: 100,
          quantityReturnedToSupplier: 100,
          lineHireInCost: 100 * UNIT_COST,
        },
      });
      expect(returnedUnsettled.status).toBe("RETURNED");
      expect(returnedUnsettled.settlementStatus).toBe("UNSETTLED");

      const eraA = createEraHarness([returnedUnsettled]);
      const settledA = await eraA.settle.execute(
        { id: AGREEMENT_ID },
        { paymentAmount: 100 * UNIT_COST },
      );
      expect(settledA.status).toBe("RETURNED");
      expect(settledA.settlementStatus).toBe("SETTLED");
      expect(settledA).not.toHaveProperty("purchaseOrderId");

      const openOperational = seedAlignedEra({
        status: "ALLOCATED",
        settlementStatus: "UNSETTLED",
        amountDue: 100 * UNIT_COST,
        amountPaid: 0,
        totalHireInCost: 100 * UNIT_COST,
        item: {
          quantityRequested: 100,
          quantityConfirmed: 100,
          quantityReceived: 100,
          quantityAllocated: 100,
          lineHireInCost: 100 * UNIT_COST,
        },
      });
      const eraB = createEraHarness([openOperational]);
      const settledB = await eraB.settle.execute(
        { id: AGREEMENT_ID },
        { paymentAmount: 100 * UNIT_COST },
      );
      expect(settledB.status).toBe("ALLOCATED");
      expect(settledB.settlementStatus).toBe("SETTLED");
      expect(settledB).not.toHaveProperty("purchaseOrderId");

      const inUse = seedAlignedEra({
        status: "IN_USE",
        settlementStatus: "UNSETTLED",
        amountDue: 50 * UNIT_COST,
        amountPaid: 0,
        totalHireInCost: 50 * UNIT_COST,
        item: {
          quantityRequested: 50,
          quantityConfirmed: 50,
          quantityReceived: 50,
          quantityAllocated: 50,
          quantityDispatched: 50,
          lineHireInCost: 50 * UNIT_COST,
        },
      });
      const eraInUse = createEraHarness([inUse]);
      const settledInUse = await eraInUse.settle.execute(
        { id: AGREEMENT_ID },
        { paymentAmount: 50 * UNIT_COST },
      );
      expect(settledInUse.status).toBe("IN_USE");
      expect(settledInUse.settlementStatus).toBe("SETTLED");

      const eraReject = createEraHarness([
        seedAlignedEra({
          status: "RETURN_PENDING",
          amountDue: 100 * UNIT_COST,
          amountPaid: 0,
          totalHireInCost: 100 * UNIT_COST,
          item: {
            quantityRequested: 100,
            quantityConfirmed: 100,
            quantityReceived: 100,
            quantityAllocated: 100,
            quantityDispatched: 100,
            quantityReturnedFromCustomer: 100,
            lineHireInCost: 100 * UNIT_COST,
          },
        }),
      ]);
      await expect(
        eraReject.settle.execute(
          { id: AGREEMENT_ID },
          { paymentAmount: 100 * UNIT_COST + 1 },
        ),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });
  });

  describe("T11 — F-02 + analytics isolation across external lifecycle", () => {
    it("external lifecycle never changes onHand/reserved/F-02 capacity/inventoryValue", async () => {
      const qty = 50;
      const inventoryRepository = new InMemoryInventoryRepository();
      inventoryRepository.seed([
        buildInventoryEntity({
          id: INVENTORY_ID,
          productId: PRODUCT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityOnHand: 300,
          reservedQuantity: 0,
        }),
      ]);
      const stockMovementRepository = new InMemoryStockMovementRepository();
      const rentalOrderRepository = new InMemoryRentalOrderRepository();
      rentalOrderRepository.seed([
        buildOrder({ quantity: qty, reservedQuantity: 0 }),
      ]);
      const dispatchRepository = new InMemoryDispatchRepository();
      const returnRepository = new InMemoryReturnRepository();

      const inv0 = await inventoryRepository.findById(INVENTORY_ID);
      const ownedBaseline = snapshotOwned(inv0);
      const f02Baseline = f02Available(
        ownedBaseline.quantityOnHand,
        ownedBaseline.reservedQuantity,
      );
      const valueBaseline = inventoryValue(
        ownedBaseline.quantityOnHand,
        PURCHASE_COST,
      );

      async function assertIsolation(step: string) {
        const inv = await inventoryRepository.findById(INVENTORY_ID);
        assertOwnedUnchanged(inv, ownedBaseline);
        const snap = f02Available(
          inv!.quantityOnHand,
          inv!.reservedQuantity,
        );
        expect(snap.dateAwareAvailableQuantity, step).toBe(
          f02Baseline.dateAwareAvailableQuantity,
        );
        expect(snap.baseCapacity, step).toBe(f02Baseline.baseCapacity);
        expect(
          inventoryValue(inv!.quantityOnHand, PURCHASE_COST),
          step,
        ).toBe(valueBaseline);
        expect(stockMovementRepository.count(), step).toBe(0);
      }

      const era = createEraHarness([]);
      const created = await era.create.execute(toCreateInput(qty));
      await assertIsolation("after create");

      await era.confirm.execute({ id: created.id });
      await assertIsolation("after confirm");

      await era.receive.execute(
        { id: created.id },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: qty }] },
      );
      await assertIsolation("after receive");

      const allocated = await era.allocate.execute(
        { id: created.id },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: qty }] },
      );
      await assertIsolation("after allocate");
      expect(allocated.amountDue).toBe(qty * UNIT_COST);
      expect(allocated.totalHireInCost).toBe(qty * UNIT_COST);

      const dispatchScope = createDispatchScope({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository: era.repository,
      });
      const createDispatch = new CreateDispatchService(
        dispatchScope,
        createMockNumberSequenceRepository(),
      );
      const completeDispatch = new CompleteDispatchService(dispatchScope);
      const dispatch = await createDispatch.execute({
        dispatchNumber: "DSP-2557-T11",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: qty,
            ownedQuantity: 0,
            externalQuantity: qty,
          },
        ],
      } as CreateDispatchInput);
      await markDispatchReady(dispatchScope, dispatch.id);
      await completeDispatch.execute({ id: dispatch.id });
      await assertIsolation("after dispatch");

      const returnScope = createReturnScope({
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        externalRentalRepository: era.repository,
      });
      await completeCustomerReturn({
        returnScope,
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchId: dispatch.id,
        quantity: qty,
        ownedQuantity: 0,
        externalQuantity: qty,
        returnNumber: "RTN-2557-T11",
      });
      await assertIsolation("after customer return");

      await era.supplierReturn.execute(
        { id: created.id },
        { items: [{ rentalOrderItemId: ITEM_ID, quantity: qty }] },
      );
      await assertIsolation("after supplier return");

      const settled = await era.settle.execute(
        { id: created.id },
        { paymentAmount: qty * UNIT_COST },
      );
      await assertIsolation("after settle");
      expect(settled.settlementStatus).toBe("SETTLED");
      expect(settled.totalHireInCost).toBe(qty * UNIT_COST);
      expect(settled.amountDue).toBe(qty * UNIT_COST);
      expect(valueBaseline).toBe(300 * PURCHASE_COST);
      expect(settled.totalHireInCost).not.toBe(valueBaseline);

      const exported = availabilityRules as Record<string, unknown>;
      expect("borrowInventory" in exported).toBe(false);
      expect("hireIn" in exported).toBe(false);
      expect("externalRental" in exported).toBe(false);
    });
  });

  describe("API thin happy-path (mock services)", () => {
    it("chains create→confirm→receive→allocate→supplier-return→settle via mock execute", async () => {
      const calls: string[] = [];
      const dto = (status: string, settlementStatus = "UNSETTLED") => ({
        id: AGREEMENT_ID,
        status,
        settlementStatus,
        amountDue: 2500,
        totalHireInCost: status === "DRAFT" || status === "CONFIRMED" ? 0 : 2500,
      });

      const create = { execute: vi.fn(async () => {
        calls.push("create");
        return dto("DRAFT");
      }) };
      const confirm = { execute: vi.fn(async () => {
        calls.push("confirm");
        return dto("CONFIRMED");
      }) };
      const receive = { execute: vi.fn(async () => {
        calls.push("receive");
        return dto("RECEIVED");
      }) };
      const allocate = { execute: vi.fn(async () => {
        calls.push("allocate");
        return dto("ALLOCATED");
      }) };
      const supplierReturn = { execute: vi.fn(async () => {
        calls.push("supplier-return");
        return dto("RETURNED");
      }) };
      const settle = { execute: vi.fn(async () => {
        calls.push("settle");
        return dto("RETURNED", "SETTLED");
      }) };

      expect((await create.execute()).status).toBe("DRAFT");
      expect((await confirm.execute()).status).toBe("CONFIRMED");
      expect((await receive.execute()).status).toBe("RECEIVED");
      expect((await allocate.execute()).status).toBe("ALLOCATED");
      expect((await supplierReturn.execute()).status).toBe("RETURNED");
      expect((await settle.execute()).settlementStatus).toBe("SETTLED");
      expect(calls).toEqual([
        "create",
        "confirm",
        "receive",
        "allocate",
        "supplier-return",
        "settle",
      ]);
    });
  });
});
