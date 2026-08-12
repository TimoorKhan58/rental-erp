import { describe, expect, it } from "vitest";
import { CompleteDispatchService } from "@/modules/dispatch/application/services/complete-dispatch.service";
import { CreateDispatchService } from "@/modules/dispatch/application/services/create-dispatch.service";
import { UpdateDispatchService } from "@/modules/dispatch/application/services/update-dispatch.service";
import type { CreateDispatchInput } from "@/modules/dispatch/application/schemas/dispatch.schemas";
import { CompleteReturnService } from "@/modules/return/application/services/complete-return.service";
import { CreateReturnService } from "@/modules/return/application/services/create-return.service";
import { InspectReturnService } from "@/modules/return/application/services/inspect-return.service";
import { ReceiveReturnService } from "@/modules/return/application/services/receive-return.service";
import type { CreateReturnInput } from "@/modules/return/application/schemas/return.schemas";
import { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import {
  AGREEMENT_ID,
  AGREEMENT_ITEM_ID,
  buildExternalRentalAgreementEntity,
} from "@/modules/external-rental/tests/helpers/external-rental.fixtures";
import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import {
  INVENTORY_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { createMockNumberSequenceRepository } from "@/modules/settings/tests/helpers/mock-number-sequence.repository";
import { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { createPassThroughTransactionRunner as createReturnPassThrough } from "@/modules/return/tests/helpers/transaction-test-runner";

import {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "../tests/helpers/in-memory-dispatch.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import { createPassThroughTransactionRunner } from "../tests/helpers/transaction-test-runner";

/**
 * Phase 25.5.4 — source-aware dispatch / customer return matrix.
 */
describe("Source-aware dispatch + customer return (Phase 25.5.4)", () => {
  function seedAllocatedAgreement(allocated = 40) {
    return buildExternalRentalAgreementEntity({
      id: AGREEMENT_ID,
      rentalOrderId: RENTAL_ORDER_ID,
      status: "ALLOCATED",
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
  }) {
    return createPassThroughTransactionRunner({
      dispatchRepository: options.dispatchRepository,
      rentalOrderRepository: options.rentalOrderRepository,
      inventoryRepository: options.inventoryRepository,
      stockMovementRepository: options.stockMovementRepository,
      externalRentalRepository: options.externalRentalRepository,
      auditLogger: new MockAuditLogger(),
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
      auditLogger: new MockAuditLogger(),
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

  it("owned-only dispatch mutates inventory (F-01 unchanged)", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
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
    const scope = createDispatchScope({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      externalRentalRepository,
    });

    const create = new CreateDispatchService(
      scope,
      createMockNumberSequenceRepository(),
    );
    const complete = new CompleteDispatchService(scope);

    const created = await create.execute({
      dispatchNumber: "DSP-SRC-OWNED-001",
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

    await markReady(scope, created.id);
    const result = await complete.execute({ id: created.id });

    expect(result.status).toBe("COMPLETED");
    expect(result.items[0].ownedQuantity).toBeNull();
    expect(result.items[0].externalQuantity).toBeNull();

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(45);
    expect(stockMovementRepository.count()).toBe(2);
  });

  it("external-only dispatch does not change quantityOnHand or create OUT", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    const reserved = buildReservedRentalOrderEntity();
    rentalOrderRepository.seed([reserved]);

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
    externalRentalRepository.seed([seedAllocatedAgreement(40)]);

    const scope = createDispatchScope({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      externalRentalRepository,
    });

    const create = new CreateDispatchService(
      scope,
      createMockNumberSequenceRepository(),
    );
    const complete = new CompleteDispatchService(scope);

    const created = await create.execute({
      dispatchNumber: "DSP-SRC-EXT-001",
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
      deliveryMethod: "DELIVERY",
      deliveryAddress: "Venue",
      items: [
        {
          productId: PRODUCT_ID,
          rentalOrderItemId: ITEM_ID,
          quantity: 40,
          ownedQuantity: 0,
          externalQuantity: 40,
        },
      ],
    } as CreateDispatchInput);

    expect(created.items[0].ownedQuantity).toBe(0);
    expect(created.items[0].externalQuantity).toBe(40);

    await markReady(scope, created.id);
    await complete.execute({ id: created.id });

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(50);
    expect(inventory?.reservedQuantity).toBe(10);
    expect(stockMovementRepository.count()).toBe(0);

    const agreement = await externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityDispatched).toBe(40);
    expect(agreement?.status).toBe("IN_USE");

    const order = await rentalOrderRepository.findById(RENTAL_ORDER_ID);
    expect(order?.items[0]?.reservedQuantity).toBe(
      reserved.items[0]?.reservedQuantity,
    );
  });

  it("mixed owned + external dispatch updates both domains", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
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
    externalRentalRepository.seed([seedAllocatedAgreement(40)]);

    const scope = createDispatchScope({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      externalRentalRepository,
    });

    const create = new CreateDispatchService(
      scope,
      createMockNumberSequenceRepository(),
    );
    const complete = new CompleteDispatchService(scope);

    const created = await create.execute({
      dispatchNumber: "DSP-SRC-MIX-001",
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
      deliveryMethod: "DELIVERY",
      deliveryAddress: "Venue",
      items: [
        {
          productId: PRODUCT_ID,
          rentalOrderItemId: ITEM_ID,
          quantity: 10,
          ownedQuantity: 5,
          externalQuantity: 5,
        },
      ],
    } as CreateDispatchInput);

    await markReady(scope, created.id);
    await complete.execute({ id: created.id });

    const inventory = await inventoryRepository.findById(INVENTORY_ID);
    expect(inventory?.quantityOnHand).toBe(45);
    expect(stockMovementRepository.count()).toBe(2);

    const agreement = await externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityDispatched).toBe(5);
  });

  it("rejects external dispatch greater than allocated", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([seedAllocatedAgreement(10)]);

    const scope = createDispatchScope({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      externalRentalRepository,
    });

    const create = new CreateDispatchService(
      scope,
      createMockNumberSequenceRepository(),
    );

    await expect(
      create.execute({
        dispatchNumber: "DSP-SRC-OVER-001",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 11,
            ownedQuantity: 0,
            externalQuantity: 11,
          },
        ],
      } as CreateDispatchInput),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects external dispatch before allocation", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const externalRentalRepository = new InMemoryExternalRentalRepository();
    externalRentalRepository.seed([
      buildExternalRentalAgreementEntity({
        rentalOrderId: RENTAL_ORDER_ID,
        status: "RECEIVED",
        items: [
          {
            id: AGREEMENT_ITEM_ID,
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID as never,
            quantityRequested: 40,
            quantityConfirmed: 40,
            quantityReceived: 40,
            quantityAllocated: 0,
            quantityDispatched: 0,
            quantityReturnedFromCustomer: 0,
            quantityReturnedToSupplier: 0,
            quantityWrittenOff: 0,
            unitCost: 10,
            lineHireInCost: 400,
            notes: null,
          },
        ],
      }),
    ]);

    const scope = createDispatchScope({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      externalRentalRepository,
    });

    const create = new CreateDispatchService(
      scope,
      createMockNumberSequenceRepository(),
    );

    await expect(
      create.execute({
        dispatchNumber: "DSP-SRC-PRE-001",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
            ownedQuantity: 0,
            externalQuantity: 5,
          },
        ],
      } as CreateDispatchInput),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects negative source quantity via schema", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
    const scope = createDispatchScope({
      dispatchRepository: new InMemoryDispatchRepository(),
      rentalOrderRepository,
      inventoryRepository: new InMemoryInventoryRepository(),
      stockMovementRepository: new InMemoryStockMovementRepository(),
      externalRentalRepository: new InMemoryExternalRentalRepository(),
    });

    const create = new CreateDispatchService(
      scope,
      createMockNumberSequenceRepository(),
    );

    await expect(
      create.execute({
        dispatchNumber: "DSP-SRC-NEG-001",
        rentalOrderId: RENTAL_ORDER_ID,
        dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Venue",
        items: [
          {
            productId: PRODUCT_ID,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
            ownedQuantity: -1,
            externalQuantity: 6,
          },
        ],
      } as CreateDispatchInput),
    ).rejects.toBeTruthy();
  });

  it("external customer return does not IN restock and leaves supplierReturned untouched", async () => {
    const dispatchRepository = new InMemoryDispatchRepository();
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildReservedRentalOrderEntity()]);
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
    externalRentalRepository.seed([seedAllocatedAgreement(40)]);
    const returnRepository = new InMemoryReturnRepository();

    const dispatchScope = createDispatchScope({
      dispatchRepository,
      rentalOrderRepository,
      inventoryRepository,
      stockMovementRepository,
      externalRentalRepository,
    });
    const returnScope = createReturnScope({
      returnRepository,
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
      dispatchNumber: "DSP-SRC-RET-001",
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchDate: new Date("2026-02-01T00:00:00.000Z"),
      deliveryMethod: "DELIVERY",
      deliveryAddress: "Venue",
      items: [
        {
          productId: PRODUCT_ID,
          rentalOrderItemId: ITEM_ID,
          quantity: 40,
          ownedQuantity: 0,
          externalQuantity: 40,
        },
      ],
    } as CreateDispatchInput);
    await markReady(dispatchScope, dispatch.id);
    await completeDispatch.execute({ id: dispatch.id });

    const createReturn = new CreateReturnService(
      returnScope,
      createMockNumberSequenceRepository(),
    );
    const receiveReturn = new ReceiveReturnService(returnScope);
    const inspectReturn = new InspectReturnService(returnScope);
    const completeReturn = new CompleteReturnService(returnScope);

    const ret = await createReturn.execute({
      returnNumber: "RTN-SRC-EXT-001",
      rentalOrderId: RENTAL_ORDER_ID,
      dispatchId: dispatch.id,
      returnDate: new Date("2026-02-10T00:00:00.000Z"),
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          quantity: 40,
          ownedQuantity: 0,
          externalQuantity: 40,
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
            goodQuantity: 40,
            damagedQuantity: 0,
            lostQuantity: 0,
            missingQuantity: 0,
          },
        ],
      },
    );

    const onHandBefore = (await inventoryRepository.findById(INVENTORY_ID))
      ?.quantityOnHand;
    await completeReturn.execute({ id: ret.id });
    const onHandAfter = (await inventoryRepository.findById(INVENTORY_ID))
      ?.quantityOnHand;

    expect(onHandBefore).toBe(50);
    expect(onHandAfter).toBe(50);
    expect(stockMovementRepository.count()).toBe(0);

    const agreement = await externalRentalRepository.findById(AGREEMENT_ID);
    expect(agreement?.items[0].quantityReturnedFromCustomer).toBe(40);
    expect(agreement?.items[0].quantityReturnedToSupplier).toBe(0);
    expect(agreement?.status).toBe("RETURN_PENDING");
  });
});
