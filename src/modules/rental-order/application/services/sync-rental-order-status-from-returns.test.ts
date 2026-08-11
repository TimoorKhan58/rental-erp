import { describe, expect, it } from "vitest";

import {
  DISPATCH_ID,
  ITEM_ID,
  OTHER_DISPATCH_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  buildDispatchEntity,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import { Return } from "@/modules/return/domain/return.entity";
import {
  RETURN_ID,
  OTHER_RETURN_ID,
  buildCompletedReturnEntity,
  buildCreateReturnData,
} from "@/modules/return/tests/helpers/return.fixtures";
import { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import type { DispatchId, ProductId, ReturnInspectionId } from "@/shared/domain/ids";

import { syncRentalOrderStatusFromReturns } from "./sync-rental-order-status-from-returns";

function buildOnRentOrder(reservedQuantity = 100) {
  return buildRentalOrderEntity({
    status: "ON_RENT",
    reservedQuantity,
    items: [
      {
        id: ITEM_ID,
        productId: PRODUCT_ID as ProductId,
        quantity: reservedQuantity,
        dailyRate: 150,
        reservedQuantity,
        startDate: new Date("2026-02-01T00:00:00.000Z"),
        endDate: new Date("2026-02-05T00:00:00.000Z"),
        numberOfDays: 4,
      },
    ],
  });
}

function buildCompletedDispatch(quantity: number, id: DispatchId = DISPATCH_ID) {
  return buildDispatchEntity({
    id,
    status: "COMPLETED",
    items: [
      {
        id: `${id}-item`,
        productId: PRODUCT_ID as ProductId,
        rentalOrderItemId: ITEM_ID,
        quantity,
        notes: null,
      },
    ],
  });
}

function buildCompletedReturnForDispatch(input: {
  id: ReturnInspectionId;
  dispatchId: DispatchId;
  quantity: number;
  returnNumber?: string;
}) {
  const created = Return.create(
    buildCreateReturnData({
      returnNumber: input.returnNumber ?? `RTN-${input.id.slice(0, 8)}`,
      dispatchId: input.dispatchId,
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          dispatchItemId: `${input.dispatchId}-item`,
          quantity: input.quantity,
        },
      ],
    }),
  );
  const now = new Date("2026-02-11T00:00:00.000Z");

  return Return.reconstitute({
    id: input.id,
    returnNumber: created.returnNumber,
    rentalOrderId: created.rentalOrderId,
    dispatchId: created.dispatchId,
    returnDate: created.returnDate,
    remarks: created.remarks,
    status: "COMPLETED",
    receivedAt: now,
    inspectedAt: now,
    completedAt: now,
    items: created.items.map((item, index) => ({
      ...item,
      id: index === 0 ? `${input.id}-item` : item.id,
      returnedQuantity: input.quantity,
      goodQuantity: input.quantity,
      damagedQuantity: 0,
      lostQuantity: 0,
      missingQuantity: 0,
    })),
    createdById: created.createdById,
    createdAt: now,
    updatedAt: now,
  });
}

describe("syncRentalOrderStatusFromReturns (Phase 25.3.4)", () => {
  it("leaves ON_RENT unchanged when no returns exist", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildOnRentOrder()]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([buildCompletedDispatch(60)]);
    const returnRepository = new InMemoryReturnRepository();

    const result = await syncRentalOrderStatusFromReturns(RENTAL_ORDER_ID, {
      dispatchRepository,
      returnRepository,
      rentalOrderRepository,
    });

    expect(result).toBeNull();
    expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
      "ON_RENT",
    );
  });

  it("moves ON_RENT to PARTIALLY_RETURNED after partial return of multi-dispatch qty", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildOnRentOrder(100)]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildCompletedDispatch(60, DISPATCH_ID),
      buildCompletedDispatch(40, OTHER_DISPATCH_ID),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForDispatch({
        id: RETURN_ID,
        dispatchId: DISPATCH_ID,
        quantity: 40,
      }),
    ]);

    const result = await syncRentalOrderStatusFromReturns(RENTAL_ORDER_ID, {
      dispatchRepository,
      returnRepository,
      rentalOrderRepository,
    });

    expect(result).toBe("PARTIALLY_RETURNED");
    expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
      "PARTIALLY_RETURNED",
    );
  });

  it("moves ON_RENT to COMPLETED when all multi-dispatch quantities are returned", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([buildOnRentOrder(100)]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildCompletedDispatch(60, DISPATCH_ID),
      buildCompletedDispatch(40, OTHER_DISPATCH_ID),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([
      buildCompletedReturnForDispatch({
        id: RETURN_ID,
        dispatchId: DISPATCH_ID,
        quantity: 60,
        returnNumber: "RTN-MULTI-001",
      }),
      buildCompletedReturnForDispatch({
        id: OTHER_RETURN_ID,
        dispatchId: OTHER_DISPATCH_ID,
        quantity: 40,
        returnNumber: "RTN-MULTI-002",
      }),
    ]);

    const result = await syncRentalOrderStatusFromReturns(RENTAL_ORDER_ID, {
      dispatchRepository,
      returnRepository,
      rentalOrderRepository,
    });

    expect(result).toBe("COMPLETED");
    expect((await rentalOrderRepository.findById(RENTAL_ORDER_ID))?.status).toBe(
      "COMPLETED",
    );
  });

  it("completes single-dispatch full return from ON_RENT", async () => {
    const rentalOrderRepository = new InMemoryRentalOrderRepository();
    rentalOrderRepository.seed([
      buildRentalOrderEntity({
        status: "ON_RENT",
        reservedQuantity: 10,
      }),
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    dispatchRepository.seed([
      buildDispatchEntity({
        status: "COMPLETED",
        items: [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID as ProductId,
            rentalOrderItemId: ITEM_ID,
            quantity: 5,
            notes: null,
          },
        ],
      }),
    ]);
    const returnRepository = new InMemoryReturnRepository();
    returnRepository.seed([buildCompletedReturnEntity()]);

    const result = await syncRentalOrderStatusFromReturns(RENTAL_ORDER_ID, {
      dispatchRepository,
      returnRepository,
      rentalOrderRepository,
    });

    expect(result).toBe("COMPLETED");
  });
});
