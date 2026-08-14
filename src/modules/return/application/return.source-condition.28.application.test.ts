import { describe, expect, it, vi } from "vitest";

import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import { CreateDispatchService } from "@/modules/dispatch/application/services/create-dispatch.service";
import { UpdateDispatchService } from "@/modules/dispatch/application/services/update-dispatch.service";
import type { CreateDispatchInput } from "@/modules/dispatch/application/schemas/dispatch.schemas";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger } from "@/modules/dispatch/tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner as createDispatchPassThrough } from "@/modules/dispatch/tests/helpers/transaction-test-runner";
import {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
import { CreateReturnService } from "@/modules/return/application/services/create-return.service";
import { InspectReturnService } from "@/modules/return/application/services/inspect-return.service";
import { ReceiveReturnService } from "@/modules/return/application/services/receive-return.service";
import type { CreateReturnInput } from "@/modules/return/application/schemas/return.schemas";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "@/modules/return/tests/helpers/transaction-test-runner";
import {
  AGREEMENT_ID,
  AGREEMENT_ITEM_ID,
  buildExternalRentalAgreementEntity,
} from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import {
  INVENTORY_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { calculateDateAwareAvailabilitySnapshot } from "@/modules/rental-order/domain/rental-order.availability.rules";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { calculateInventoryValue } from "@/modules/reporting/domain/reporting.rules";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

const PURCHASE_COST = 40;

/**
 * Phase 28 — mixed return source × condition attribution.
 */
describe("Phase 28 source × condition return attribution", () => {
  function buildOrder(quantity: number, reservedQuantity: number) {
    return buildRentalOrderEntity({
      status: "RESERVED",
      reservedQuantity,
      items: [
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity,
          dailyRate: 150,
          reservedQuantity,
          startDate: new Date("2026-02-01T00:00:00.000Z"),
          endDate: new Date("2026-02-05T00:00:00.000Z"),
          numberOfDays: 5,
        },
      ],
    });
  }

  function seedAllocatedAgreement(allocated: number) {
    return buildExternalRentalAgreementEntity({
      id: AGREEMENT_ID,
      rentalOrderId: RENTAL_ORDER_ID,
      status: "ALLOCATED",
      amountDue: allocated * 10,
      totalHireInCost: allocated * 10,
      amountPaid: 0,
      settlementStatus: "UNSETTLED",
      items: [
        {
          id: AGREEMENT_ITEM_ID,
          productId: PRODUCT_ID,
          rentalOrderItemId: ITEM_ID as never,
          quantityRequested: allocated,
          quantityConfirmed: allocated,
          quantityReceived: allocated,
          quantityAllocated: allocated,
          quantityDispatched: 0,
          quantityReturnedFromCustomer: 0,
          quantityReturnedToSupplier: 0,
          quantityWrittenOff: 0,
          unitCost: 10,
          lineHireInCost: allocated * 10,
          notes: null,
        },
      ],
    });
  }

  function createDispatchScope(options: {
    dispatchRepository: InMemoryDispatchRepository;
    rentalOrderRepository: InMemoryRentalOrderRepository;
    inventoryRepository: InMemoryInventoryRepository;
    stockMovementRepository: InMemoryStockMovementRepository;
    externalRentalRepository: InMemoryExternalRentalRepository;
    auditLogger?: MockAuditLogger;
  }) {
    return createDispatchPassThrough({
      dispatchRepository: options.dispatchRepository,
      rentalOrderRepository: options.rentalOrderRepository,
      inventoryRepository: options.inventoryRepository,
      stockMovementRepository: options.stockMovementRepository,
      externalRentalRepository: options.externalRentalRepository,
      auditLogger: options.auditLogger ?? new MockAuditLogger(),
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
    auditLogger?: MockAuditLogger;
  }) {
    return createPassThroughTransactionRunner({
      returnRepository: options.returnRepository,
      dispatchRepository: options.dispatchRepository,
      rentalOrderRepository: options.rentalOrderRepository,
      inventoryRepository: options.inventoryRepository,
      stockMovementRepository: options.stockMovementRepository,
      externalRentalRepository: options.externalRentalRepository,
      auditLogger: options.auditLogger ?? new MockAuditLogger(),
      ...mockNotificationWriteScopeDeps,
      userId: USER_ID,
    });
  }

  async function markReady(
    scope: ReturnType<typeof createDispatchScope>,
    id: string,
  ) {
    await new UpdateDispatchService(scope).execute({ id }, { markReady: true });
  }

  async function completeDispatchFlow(options: {
    owned: number;
    external: number;
    onHand: number;
  }) {
    const total = options.owned + options.external;
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildOrder(total, options.owned)]);
    const inventoryRepository = new InMemoryInventoryRepository();
    inventoryRepository.seed([
      buildInventoryEntity({
        id: INVENTORY_ID,
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: options.onHand,
        reservedQuantity: options.owned,
      }),
    ]);
    const stockMovementRepository = new InMemoryStockMovementRepository();
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    if (options.external > 0) {
      externalRentalRepository.seed([seedAllocatedAgreement(options.external)]);
    }
    const returnRepository = new InMemoryReturnRepository();
    const auditLogger = new MockAuditLogger();

    const dispatchScope = createDispatchScope({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      externalRentalRepository,
      auditLogger,
    });
    const createDispatch = new CreateDispatchService(
      dispatchScope,
      createMockNumberSequenceRepository(),
    );
    const completeDispatch = new CompleteDispatchService(dispatchScope);

    const dispatch = await createDispatch.execute({
      dispatchNumber: `DSP-T28-${options.owned}-${options.external}`,
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
      deliveryMethod: "DELIVERY",
      deliveryAddress: "Venue",
      items: [
        {
          productId: PRODUCT_ID,
          rentalOrderItemId: ITEM_ID,
          quantity: total,
          ownedQuantity: options.owned,
          externalQuantity: options.external,
        },
      ],
    } as CreateDispatchInput);
    await markReady(dispatchScope, dispatch.id);
    await completeDispatch.execute({ id: dispatch.id });

    return {
      dispatch,
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      externalRentalRepository,
      returnRepository,
      auditLogger,
    };
  }

  async function createReceiveInspectComplete(options: {
    ctx: Awaited<ReturnType<typeof completeDispatchFlow>>;
    quantity: number;
    ownedQuantity?: number | null;
    externalQuantity?: number | null;
    omitSource?: boolean;
    inspect: {
      goodQuantity: number;
      damagedQuantity?: number;
      lostQuantity?: number;
      missingQuantity?: number;
      ownedGoodQuantity?: number;
      ownedDamagedQuantity?: number;
      ownedLostQuantity?: number;
      externalGoodQuantity?: number;
      externalDamagedQuantity?: number;
      externalLostQuantity?: number;
    };
    useRollback?: boolean;
    failAuditOnComplete?: boolean;
  }) {
    const {
      dispatch,
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      externalRentalRepository,
      returnRepository,
      auditLogger,
    } = options.ctx;

    const returnScope = options.useRollback
      ? createRollbackTransactionRunner(
          returnRepository,
          dispatchRepository,
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          USER_ID,
          externalRentalRepository,
        )
      : createReturnScope({
          returnRepository,
          dispatchRepository,
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          externalRentalRepository,
          auditLogger,
        });

    const createReturn = new CreateReturnService(
      returnScope,
      createMockNumberSequenceRepository(),
    );
    const receiveReturn = new ReceiveReturnService(returnScope);
    const inspectReturn = new InspectReturnService(returnScope);
    const completeReturn = new CompleteReturnService(returnScope);

    const item: CreateReturnInput["items"][number] = {
      rentalOrderItemId: ITEM_ID,
      quantity: options.quantity,
    };
    if (!options.omitSource) {
      if (options.ownedQuantity !== undefined) {
        item.ownedQuantity = options.ownedQuantity;
      }
      if (options.externalQuantity !== undefined) {
        item.externalQuantity = options.externalQuantity;
      }
    }

    const ret = await createReturn.execute({
      returnNumber: `RTN-T28-${Date.now()}-${options.quantity}`,
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchId: dispatch.id,
      returnDate: new Date("2026-02-10T00:00:00.000Z"),
      items: [item],
    } as CreateReturnInput);

    await receiveReturn.execute({ id: ret.id });
    await inspectReturn.execute(
      { id: ret.id },
      {
        items: [
          {
            rentalOrderItemId: ITEM_ID,
            goodQuantity: options.inspect.goodQuantity,
            damagedQuantity: options.inspect.damagedQuantity ?? 0,
            lostQuantity: options.inspect.lostQuantity ?? 0,
            missingQuantity: options.inspect.missingQuantity ?? 0,
            ownedGoodQuantity: options.inspect.ownedGoodQuantity,
            ownedDamagedQuantity: options.inspect.ownedDamagedQuantity,
            ownedLostQuantity: options.inspect.ownedLostQuantity,
            externalGoodQuantity: options.inspect.externalGoodQuantity,
            externalDamagedQuantity: options.inspect.externalDamagedQuantity,
            externalLostQuantity: options.inspect.externalLostQuantity,
          },
        ],
      },
    );

    if (options.failAuditOnComplete) {
      vi.spyOn(auditLogger, "log").mockRejectedValueOnce(
        new Error("audit failure"),
      );
    }

    return completeReturn.execute({ id: ret.id });
  }

  it("T28.1 owned-only GOOD preserves IN restock and no ERA mutation", async () => {
    const ctx = await completeDispatchFlow({
      owned: 5,
      external: 0,
      onHand: 50,
    });
    const onHandAfterDispatch = (
      await ctx.inventoryRepository.findById(INVENTORY_ID)
    )?.quantityOnHand;

    await createReceiveInspectComplete({
      ctx,
      quantity: 5,
      ownedQuantity: 5,
      externalQuantity: 0,
      inspect: { goodQuantity: 5 },
    });

    const inventory = await ctx.inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe((onHandAfterDispatch ?? 0) + 5);
    expect(await ctx.externalRentalRepository.findById(AGREEMENT_ID)).toBeNull();
  });

  it("T28.2 external-only GOOD updates ERA customerReturned only", async () => {
    const ctx = await completeDispatchFlow({
      owned: 0,
      external: 40,
      onHand: 50,
    });
    const onHandBefore = (
      await ctx.inventoryRepository.findById(INVENTORY_ID)
    )?.quantityOnHand;

    await createReceiveInspectComplete({
      ctx,
      quantity: 40,
      ownedQuantity: 0,
      externalQuantity: 40,
      inspect: { goodQuantity: 40 },
    });

    const inventory = await ctx.inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(onHandBefore);
    expect(ctx.stockMovementRepository.count()).toBe(0);

    const agreement = await ctx.externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(40);
    expect(agreement?.amountPaid).toBe(0);
    expect(agreement?.settlementStatus).toBe("UNSETTLED");
  });

  it("T28.3 mixed explicit GOOD split applies owned 30 / external 20", async () => {
    const ctx = await completeDispatchFlow({
      owned: 60,
      external: 40,
      onHand: 200,
    });
    const onHandAfterDispatch = (
      await ctx.inventoryRepository.findById(INVENTORY_ID)
    )?.quantityOnHand;

    await createReceiveInspectComplete({
      ctx,
      quantity: 50,
      ownedQuantity: 30,
      externalQuantity: 20,
      inspect: {
        goodQuantity: 50,
        ownedGoodQuantity: 30,
        ownedDamagedQuantity: 0,
        ownedLostQuantity: 0,
        externalGoodQuantity: 20,
        externalDamagedQuantity: 0,
        externalLostQuantity: 0,
      },
    });

    const inventory = await ctx.inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe((onHandAfterDispatch ?? 0) + 30);
    const agreement = await ctx.externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(20);
  });

  it("T28.4 mixed without source attribution is rejected", async () => {
    const ctx = await completeDispatchFlow({ owned: 60, external: 40, onHand: 200 });

    await expect(
      createReceiveInspectComplete({
        ctx,
        quantity: 50,
        omitSource: true,
        inspect: { goodQuantity: 50 },
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);

    expect(
      (await ctx.externalRentalRepository.findById(AGREEMENT_ID))?.items[0]
        .quantityReturnedFromCustomer,
    ).toBe(0);
  });

  it("T28.5 source total mismatch is rejected", async () => {
    const ctx = await completeDispatchFlow({ owned: 60, external: 40, onHand: 200 });

    await expect(
      createReceiveInspectComplete({
        ctx,
        quantity: 50,
        ownedQuantity: 30,
        externalQuantity: 10,
        inspect: { goodQuantity: 50 },
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("T28.6 owned over-cap is rejected", async () => {
    const ctx = await completeDispatchFlow({ owned: 20, external: 40, onHand: 100 });

    await expect(
      createReceiveInspectComplete({
        ctx,
        quantity: 30,
        ownedQuantity: 30,
        externalQuantity: 0,
        inspect: { goodQuantity: 30 },
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("T28.7 external over-cap is rejected", async () => {
    const ctx = await completeDispatchFlow({ owned: 60, external: 10, onHand: 200 });

    await expect(
      createReceiveInspectComplete({
        ctx,
        quantity: 20,
        ownedQuantity: 0,
        externalQuantity: 20,
        inspect: { goodQuantity: 20 },
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("T28.8 full source × condition attribution restocks owned GOOD only", async () => {
    const ctx = await completeDispatchFlow({
      owned: 60,
      external: 40,
      onHand: 200,
    });
    const onHandAfterDispatch = (
      await ctx.inventoryRepository.findById(INVENTORY_ID)
    )?.quantityOnHand;

    await createReceiveInspectComplete({
      ctx,
      quantity: 50,
      ownedQuantity: 30,
      externalQuantity: 20,
      inspect: {
        goodQuantity: 35,
        damagedQuantity: 8,
        lostQuantity: 7,
        ownedGoodQuantity: 20,
        ownedDamagedQuantity: 5,
        ownedLostQuantity: 5,
        externalGoodQuantity: 15,
        externalDamagedQuantity: 3,
        externalLostQuantity: 2,
      },
    });

    const inventory = await ctx.inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe((onHandAfterDispatch ?? 0) + 20);

    const agreement = await ctx.externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(20);
    expect(agreement?.items[0].quantityWrittenOff).toBe(0);
    expect(agreement?.amountPaid).toBe(0);
  });

  it("critical: owned DAMAGED + external GOOD must not restock owned inventory", async () => {
    const ctx = await completeDispatchFlow({
      owned: 60,
      external: 40,
      onHand: 200,
    });
    const onHandAfterDispatch = (
      await ctx.inventoryRepository.findById(INVENTORY_ID)
    )?.quantityOnHand;

    const completed = await createReceiveInspectComplete({
      ctx,
      quantity: 50,
      ownedQuantity: 30,
      externalQuantity: 20,
      inspect: {
        goodQuantity: 20,
        damagedQuantity: 30,
        lostQuantity: 0,
        ownedGoodQuantity: 0,
        ownedDamagedQuantity: 30,
        ownedLostQuantity: 0,
        externalGoodQuantity: 20,
        externalDamagedQuantity: 0,
        externalLostQuantity: 0,
      },
    });

    expect(completed.items[0]?.ownedGoodQuantity).toBe(0);
    expect(completed.items[0]?.ownedDamagedQuantity).toBe(30);
    expect(completed.items[0]?.ownedLostQuantity).toBe(0);
    expect(completed.items[0]?.externalGoodQuantity).toBe(20);
    expect(completed.items[0]?.externalDamagedQuantity).toBe(0);
    expect(completed.items[0]?.externalLostQuantity).toBe(0);

    const inventory = await ctx.inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(onHandAfterDispatch);

    const agreement = await ctx.externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(20);
    expect(agreement?.items[0].quantityWrittenOff).toBe(0);
    expect(agreement?.settlementStatus).toBe("UNSETTLED");
    expect(agreement?.amountPaid).toBe(0);
  });

  it("T28.9 condition mismatch is rejected", async () => {
    const ctx = await completeDispatchFlow({ owned: 60, external: 40, onHand: 200 });

    await expect(
      createReceiveInspectComplete({
        ctx,
        quantity: 50,
        ownedQuantity: 30,
        externalQuantity: 20,
        inspect: {
          goodQuantity: 25,
          damagedQuantity: 0,
          lostQuantity: 0,
          ownedGoodQuantity: 20,
          ownedDamagedQuantity: 5,
          ownedLostQuantity: 0,
          externalGoodQuantity: 15,
          externalDamagedQuantity: 3,
          externalLostQuantity: 2,
        },
      }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("T28.10 external damaged/lost does not write off or settle", async () => {
    const ctx = await completeDispatchFlow({
      owned: 0,
      external: 40,
      onHand: 80,
    });
    const before = await ctx.inventoryRepository.findById(INVENTORY_ID);
    const valueBefore = calculateInventoryValue(
      before!.quantityOnHand,
      PURCHASE_COST,
    );

    await createReceiveInspectComplete({
      ctx,
      quantity: 40,
      ownedQuantity: 0,
      externalQuantity: 40,
      inspect: {
        goodQuantity: 30,
        damagedQuantity: 5,
        lostQuantity: 5,
      },
    });

    const after = await ctx.inventoryRepository.findById(INVENTORY_ID);
    expect(after?.quantityOnHand).toBe(before?.quantityOnHand);
    expect(after?.reservedQuantity).toBe(before?.reservedQuantity);
    expect(calculateInventoryValue(after!.quantityOnHand, PURCHASE_COST)).toBe(
      valueBefore,
    );
    expect(ctx.stockMovementRepository.count()).toBe(0);

    const agreement = await ctx.externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(40);
    expect(agreement?.items[0].quantityWrittenOff).toBe(0);
    expect(agreement?.settlementStatus).toBe("UNSETTLED");
    expect(agreement?.amountPaid).toBe(0);
  });

  it("T28.11 rollback restores inventory/ERA/audit on failure", async () => {
    const ctx = await completeDispatchFlow({
      owned: 60,
      external: 40,
      onHand: 200,
    });
    const onHandBefore = (
      await ctx.inventoryRepository.findById(INVENTORY_ID)
    )?.quantityOnHand;

    // Drive create/receive/inspect on pass-through, then fail only complete.
    const returnScope = createReturnScope(ctx);
    const createReturn = new CreateReturnService(
      returnScope,
      createMockNumberSequenceRepository(),
    );
    const receiveReturn = new ReceiveReturnService(returnScope);
    const inspectReturn = new InspectReturnService(returnScope);
    const ret = await createReturn.execute({
      returnNumber: "RTN-T28-ROLLBACK",
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchId: ctx.dispatch.id,
      returnDate: new Date("2026-02-10T00:00:00.000Z"),
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          quantity: 50,
          ownedQuantity: 30,
          externalQuantity: 20,
        },
      ],
    } as CreateReturnInput);
    await receiveReturn.execute({ id: ret.id });
    await inspectReturn.execute(
      { id: ret.id },
      {
        items: [
          {
            rentalOrderItemId: ITEM_ID,
            goodQuantity: 50,
            damagedQuantity: 0,
            lostQuantity: 0,
            missingQuantity: 0,
            ownedGoodQuantity: 30,
            ownedDamagedQuantity: 0,
            ownedLostQuantity: 0,
            externalGoodQuantity: 20,
            externalDamagedQuantity: 0,
            externalLostQuantity: 0,
          },
        ],
      },
    );

    const auditCountBeforeComplete = ctx.auditLogger.entries.length;
    const rollbackScope = createRollbackTransactionRunner(
      ctx.returnRepository,
      ctx.dispatchRepository,
      ctx.rentalOrderRepository,
      ctx.inventoryRepository,
      ctx.stockMovementRepository,
      ctx.auditLogger,
      USER_ID,
      ctx.externalRentalRepository,
    );
    vi.spyOn(ctx.auditLogger, "log").mockRejectedValueOnce(
      new Error("audit failure"),
    );

    await expect(
      new CompleteReturnService(rollbackScope).execute({ id: ret.id }),
    ).rejects.toThrow(/audit failure/i);

    expect(
      (await ctx.inventoryRepository.findById(INVENTORY_ID))?.quantityOnHand,
    ).toBe(onHandBefore);
    expect(
      (await ctx.externalRentalRepository.findById(AGREEMENT_ID))?.items[0]
        .quantityReturnedFromCustomer,
    ).toBe(0);
    expect(ctx.auditLogger.entries).toHaveLength(auditCountBeforeComplete);
    expect(
      (await ctx.returnRepository.findById(ret.id as never))?.status,
    ).toBe("INSPECTED");
  });

  it("T28.12–14 F-01/F-02/valuation: owned restock only; external excluded", async () => {
    const ctx = await completeDispatchFlow({
      owned: 60,
      external: 40,
      onHand: 200,
    });
    const before = await ctx.inventoryRepository.findById(INVENTORY_ID);
    const valueBefore = calculateInventoryValue(
      before!.quantityOnHand,
      PURCHASE_COST,
    );
    const period = {
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-05T00:00:00.000Z"),
    };
    const f02Before = calculateDateAwareAvailabilitySnapshot({
      quantityOnHand: before!.quantityOnHand,
      reservedQuantity: before!.reservedQuantity,
      requestedPeriod: period,
      lines: [],
    });

    await createReceiveInspectComplete({
      ctx,
      quantity: 50,
      ownedQuantity: 30,
      externalQuantity: 20,
      inspect: {
        goodQuantity: 50,
        ownedGoodQuantity: 30,
        ownedDamagedQuantity: 0,
        ownedLostQuantity: 0,
        externalGoodQuantity: 20,
        externalDamagedQuantity: 0,
        externalLostQuantity: 0,
      },
    });

    const after = await ctx.inventoryRepository.findById(INVENTORY_ID);
    expect(after?.quantityOnHand).toBe(before!.quantityOnHand + 30);
    expect(calculateInventoryValue(after!.quantityOnHand, PURCHASE_COST)).toBe(
      valueBefore + 30 * PURCHASE_COST,
    );

    const f02After = calculateDateAwareAvailabilitySnapshot({
      quantityOnHand: after!.quantityOnHand,
      reservedQuantity: after!.reservedQuantity,
      requestedPeriod: period,
      lines: [],
    });
    expect(f02After.baseCapacity).toBe(after!.quantityOnHand);
    expect(f02Before.baseCapacity).toBe(before!.quantityOnHand);
    // External customerReturned must not appear as F-02 capacity inflation beyond owned on-hand change.
    expect(f02After.baseCapacity - f02Before.baseCapacity).toBe(30);
  });

  it("legacy mixed inspection without source×condition must not guess", async () => {
    const ctx = await completeDispatchFlow({ owned: 60, external: 40, onHand: 200 });
    const returnScope = createReturnScope(ctx);
    const createReturn = new CreateReturnService(
      returnScope,
      createMockNumberSequenceRepository(),
    );
    const receiveReturn = new ReceiveReturnService(returnScope);
    const inspectReturn = new InspectReturnService(returnScope);

    const ret = await createReturn.execute({
      returnNumber: "RTN-T28-LEGACY-MIXED",
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchId: ctx.dispatch.id,
      returnDate: new Date("2026-02-10T00:00:00.000Z"),
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          quantity: 50,
          ownedQuantity: 30,
          externalQuantity: 20,
        },
      ],
    } as CreateReturnInput);

    await receiveReturn.execute({ id: ret.id });

    await expect(
      inspectReturn.execute(
        { id: ret.id },
        {
          items: [
            {
              rentalOrderItemId: ITEM_ID,
              goodQuantity: 50,
              damagedQuantity: 0,
              lostQuantity: 0,
              missingQuantity: 0,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});
