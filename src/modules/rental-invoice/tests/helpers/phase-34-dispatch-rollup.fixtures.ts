import { buildDispatchEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { Return } from "@/modules/return/domain/return.entity";
import { buildCreateReturnData } from "@/modules/return/tests/helpers/return.fixtures";
import { buildRentalOrderEntity } from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import { buildRentalInvoiceEntity } from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import type { DispatchId, ProductId, ReturnInspectionId } from "@/shared/domain/ids";

import {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";

export { ITEM_ID, PRODUCT_ID, RENTAL_ORDER_ID };

export function dispatchIdFromIndex(index: number): DispatchId {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}` as DispatchId;
}

export function buildBulkCompletedDispatches(count: number, quantityPerDispatch = 1) {
  return Array.from({ length: count }, (_, index) =>
    buildDispatchEntity({
      id: dispatchIdFromIndex(index),
      status: "COMPLETED",
      items: [
        {
          id: `${index}-line`,
          productId: PRODUCT_ID as ProductId,
          rentalOrderItemId: ITEM_ID,
          quantity: quantityPerDispatch,
          ownedQuantity: null,
          externalQuantity: null,
          notes: null,
        },
      ],
    }),
  );
}

export function buildCompletedReturnWithMissing(params: {
  dispatchId: DispatchId;
  dispatchItemId: string;
  missingQuantity: number;
  returnId: ReturnInspectionId;
  returnNumber: string;
}): Return {
  const created = Return.create(
    buildCreateReturnData({
      returnNumber: params.returnNumber,
      dispatchId: params.dispatchId,
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          dispatchItemId: params.dispatchItemId,
          quantity: 1,
        },
      ],
    }),
  );
  const now = new Date("2026-02-11T00:00:00.000Z");

  return Return.reconstitute({
    id: params.returnId,
    returnNumber: created.returnNumber,
    rentalOrderId: created.rentalOrderId,
    dispatchId: created.dispatchId,
    returnDate: created.returnDate,
    remarks: created.remarks,
    status: "COMPLETED",
    receivedAt: now,
    inspectedAt: now,
    completedAt: now,
    items: created.items.map((item) => ({
      ...item,
      id: `${params.returnId}-item`,
      returnedQuantity: 1,
      goodQuantity: 0,
      damagedQuantity: 0,
      lostQuantity: 0,
      missingQuantity: params.missingQuantity,
    })),
    createdById: created.createdById,
    createdAt: now,
    updatedAt: now,
  });
}

export function buildCompletedRentalOrderForInvoiceRollup() {
  return buildRentalOrderEntity({
    status: "COMPLETED",
    items: [
      {
        id: ITEM_ID,
        productId: PRODUCT_ID as ProductId,
        quantity: 10,
        dailyRate: 100,
        reservedQuantity: 10,
        startDate: new Date("2026-02-01T00:00:00.000Z"),
        endDate: new Date("2026-02-05T00:00:00.000Z"),
        numberOfDays: 4,
      },
    ],
  });
}

export function buildDraftInvoiceWithMissingQuantity(missingQuantity: number): RentalInvoice {
  const draft = buildRentalInvoiceEntity({ status: "DRAFT" });
  const props = draft.toProps();

  return RentalInvoice.reconstitute({
    ...props,
    items: [
      {
        ...props.items[0]!,
        lineType: "RENTAL_CHARGE",
        description: "Tent rental",
        quantity: 10,
        unitPrice: 100,
        sortOrder: 0,
        productName: "Wedding Tent",
        dailyRate: 100,
        numberOfDays: 4,
        damagedQuantity: 0,
        lostQuantity: 0,
        missingQuantity,
        lineTotal: 4000,
      },
    ],
    subtotal: 4000,
    grandTotal: 4000,
    balance: 4000,
  });
}

/** 101 COMPLETED dispatches; return with missing qty on dispatch index 0 (excluded by legacy page-100 cap). */
export function seedPhase34Beyond100DispatchRollupFixtures(params: {
  missingQuantity: number;
  returnId: ReturnInspectionId;
  returnNumber: string;
}) {
  const dispatches = buildBulkCompletedDispatches(101);
  const targetDispatch = dispatches[0]!;
  const targetReturn = buildCompletedReturnWithMissing({
    dispatchId: targetDispatch.id,
    dispatchItemId: "0-line",
    missingQuantity: params.missingQuantity,
    returnId: params.returnId,
    returnNumber: params.returnNumber,
  });

  return {
    dispatches,
    targetDispatch,
    targetReturn,
    rentalOrder: buildCompletedRentalOrderForInvoiceRollup(),
  };
}
