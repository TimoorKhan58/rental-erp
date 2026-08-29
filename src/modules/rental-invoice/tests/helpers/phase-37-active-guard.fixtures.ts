import { buildDispatchEntity } from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import { Return } from "@/modules/return/domain/return.entity";
import { buildCreateReturnData } from "@/modules/return/tests/helpers/return.fixtures";
import type { DispatchId, ProductId, ReturnInspectionId } from "@/shared/domain/ids";

import {
  buildCompletedRentalOrderForInvoiceRollup,
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
} from "./phase-34-dispatch-rollup.fixtures";

export { RENTAL_ORDER_ID };

const MINIMAL_DISPATCH_ID =
  "11111111-1111-4111-8111-111111111101" as DispatchId;
const MINIMAL_RETURN_ID =
  "22222222-2222-4222-8222-222222222201" as ReturnInspectionId;

export function seedMinimalGenerateFromOrderFixtures() {
  const rentalOrder = buildCompletedRentalOrderForInvoiceRollup();
  const dispatch = buildDispatchEntity({
    id: MINIMAL_DISPATCH_ID,
    status: "COMPLETED",
    items: [
      {
        id: "minimal-dispatch-line",
        productId: PRODUCT_ID as ProductId,
        rentalOrderItemId: ITEM_ID,
        quantity: 10,
        ownedQuantity: null,
        externalQuantity: null,
        notes: null,
      },
    ],
  });

  const createdReturn = Return.create(
    buildCreateReturnData({
      returnNumber: "RTN-MINIMAL-GENERATE",
      dispatchId: MINIMAL_DISPATCH_ID,
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          dispatchItemId: "minimal-dispatch-line",
          quantity: 10,
        },
      ],
    }),
  );
  const now = new Date("2026-02-11T00:00:00.000Z");
  const completedReturn = Return.reconstitute({
    id: MINIMAL_RETURN_ID,
    returnNumber: createdReturn.returnNumber,
    rentalOrderId: createdReturn.rentalOrderId,
    dispatchId: createdReturn.dispatchId,
    returnDate: createdReturn.returnDate,
    remarks: createdReturn.remarks,
    status: "COMPLETED",
    receivedAt: now,
    inspectedAt: now,
    completedAt: now,
    items: createdReturn.items.map((item) => ({
      ...item,
      id: `${MINIMAL_RETURN_ID}-item`,
      returnedQuantity: 10,
      goodQuantity: 10,
      damagedQuantity: 0,
      lostQuantity: 0,
      missingQuantity: 0,
    })),
    createdById: createdReturn.createdById,
    createdAt: now,
    updatedAt: now,
  });

  return {
    rentalOrder,
    dispatch,
    completedReturn,
  };
}
