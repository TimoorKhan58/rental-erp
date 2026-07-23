import { Return } from "@/modules/return/domain/return.entity";
import type { CreateReturnData } from "@/modules/return/domain/return.types";
import {
  DISPATCH_ID,
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildReservedRentalOrderEntity,
} from "@/modules/dispatch/tests/helpers/dispatch.fixtures";
import type { ReturnInspectionId } from "@/shared/domain/ids";

export {
  DISPATCH_ID,
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildReservedRentalOrderEntity,
};

export const RETURN_ID =
  "ee0e8400-e29b-41d4-a716-446655440000" as ReturnInspectionId;

export const OTHER_RETURN_ID =
  "ee0e8400-e29b-41d4-a716-446655440001" as ReturnInspectionId;

export const VALID_CREATE_INPUT = {
  returnNumber: "RTN-2026-001",
  rentalOrderId: RENTAL_ORDER_ID,
  dispatchId: DISPATCH_ID,
  returnDate: "2026-02-10T00:00:00.000Z",
  remarks: "Items returned from event",
  items: [
    {
      rentalOrderItemId: ITEM_ID,
      dispatchItemId: ITEM_ID,
      quantity: 5,
      notes: "All items accounted for",
    },
  ],
};

export function buildCreateReturnData(
  override: Partial<CreateReturnData> = {},
): CreateReturnData {
  return {
    returnNumber: VALID_CREATE_INPUT.returnNumber,
    rentalOrderId: RENTAL_ORDER_ID,
    dispatchId: DISPATCH_ID,
    returnDate: new Date(VALID_CREATE_INPUT.returnDate),
    remarks: VALID_CREATE_INPUT.remarks,
    items: VALID_CREATE_INPUT.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId,
      quantity: item.quantity,
      notes: item.notes,
    })),
    createdById: USER_ID,
    ...override,
  };
}

export function buildReturnEntity(
  override: {
    id?: ReturnInspectionId;
    status?: Return["status"];
    items?: Return["items"];
    receivedAt?: Date | null;
    inspectedAt?: Date | null;
    completedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Return {
  const created = Return.create(buildCreateReturnData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Return.reconstitute({
    id: override.id ?? RETURN_ID,
    returnNumber: created.returnNumber,
    rentalOrderId: created.rentalOrderId,
    dispatchId: created.dispatchId,
    returnDate: created.returnDate,
    remarks: created.remarks,
    status: override.status ?? "DRAFT",
    receivedAt: override.receivedAt ?? null,
    inspectedAt: override.inspectedAt ?? null,
    completedAt: override.completedAt ?? null,
    items:
      override.items ??
      created.items.map((item, index) => ({
        ...item,
        id: index === 0 ? ITEM_ID : "dd0e8400-e29b-41d4-a716-446655440001",
      })),
    createdById: created.createdById,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildReceivedReturnEntity(): Return {
  const now = new Date("2026-01-18T10:00:00.000Z");

  return buildReturnEntity({
    status: "RECEIVED",
    receivedAt: now,
    updatedAt: now,
  });
}

export function buildInspectedReturnEntity(
  options: {
    goodQuantity?: number;
    damagedQuantity?: number;
    lostQuantity?: number;
    missingQuantity?: number;
  } = {},
): Return {
  const goodQuantity = options.goodQuantity ?? 3;
  const damagedQuantity = options.damagedQuantity ?? 1;
  const lostQuantity = options.lostQuantity ?? 1;
  const missingQuantity = options.missingQuantity ?? 0;
  const received = buildReceivedReturnEntity();
  const now = new Date("2026-01-19T10:00:00.000Z");

  return Return.reconstitute({
    ...received.toProps(),
    status: "INSPECTED",
    inspectedAt: now,
    items: received.items.map((item) => ({
      ...item,
      goodQuantity,
      damagedQuantity,
      lostQuantity,
      missingQuantity,
    })),
    updatedAt: now,
  });
}

export function buildCompletedReturnEntity(): Return {
  const inspected = buildInspectedReturnEntity();
  const now = new Date("2026-01-20T10:00:00.000Z");

  return Return.reconstitute({
    ...inspected.toProps(),
    status: "COMPLETED",
    completedAt: now,
    updatedAt: now,
  });
}
