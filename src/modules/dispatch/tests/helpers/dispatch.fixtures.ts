import { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import type { CreateDispatchData } from "@/modules/dispatch/domain/dispatch.types";
import {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildReservedRentalOrderEntity,
} from "@/modules/rental-order/tests/helpers/rental-order.fixtures";
import type { DispatchId, ProductId } from "@/shared/domain/ids";

export {
  ITEM_ID,
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildReservedRentalOrderEntity,
};

export const DISPATCH_ID =
  "bb0e8400-e29b-41d4-a716-446655440000" as DispatchId;

export const OTHER_DISPATCH_ID =
  "bb0e8400-e29b-41d4-a716-446655440001" as DispatchId;

export const VALID_CREATE_INPUT = {
  dispatchNumber: "DSP-2026-001",
  rentalOrderId: RENTAL_ORDER_ID,
  dispatchDate: "2026-02-01T00:00:00.000Z",
  deliveryMethod: "DELIVERY" as const,
  vehicleNumber: "ABC-1234",
  driverName: "John Driver",
  driverPhone: "+1234567890",
  deliveryAddress: "123 Event Venue Road, City Center",
  remarks: "Handle with care",
  items: [
    {
      productId: PRODUCT_ID,
      rentalOrderItemId: ITEM_ID,
      quantity: 5,
      notes: "Fragile items",
    },
  ],
};

export function buildCreateDispatchData(
  override: Partial<CreateDispatchData> = {},
): CreateDispatchData {
  return {
    dispatchNumber: VALID_CREATE_INPUT.dispatchNumber,
    rentalOrderId: RENTAL_ORDER_ID,
    dispatchDate: new Date(VALID_CREATE_INPUT.dispatchDate),
    deliveryMethod: VALID_CREATE_INPUT.deliveryMethod,
    vehicleNumber: VALID_CREATE_INPUT.vehicleNumber,
    driverName: VALID_CREATE_INPUT.driverName,
    driverPhone: VALID_CREATE_INPUT.driverPhone,
    deliveryAddress: VALID_CREATE_INPUT.deliveryAddress,
    remarks: VALID_CREATE_INPUT.remarks,
    items: VALID_CREATE_INPUT.items.map((item) => ({
      productId: item.productId as ProductId,
      rentalOrderItemId: item.rentalOrderItemId,
      quantity: item.quantity,
      notes: item.notes,
    })),
    createdById: USER_ID,
    ...override,
  };
}

export function buildDispatchEntity(
  override: {
    id?: DispatchId;
    status?: Dispatch["status"];
    items?: Dispatch["items"];
    readyAt?: Date | null;
    dispatchedAt?: Date | null;
    completedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Dispatch {
  const created = Dispatch.create(buildCreateDispatchData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Dispatch.reconstitute({
    id: override.id ?? DISPATCH_ID,
    dispatchNumber: created.dispatchNumber,
    rentalOrderId: created.rentalOrderId,
    dispatchDate: created.dispatchDate,
    deliveryMethod: created.deliveryMethod,
    vehicleNumber: created.vehicleNumber,
    driverName: created.driverName,
    driverPhone: created.driverPhone,
    deliveryAddress: created.deliveryAddress,
    remarks: created.remarks,
    status: override.status ?? "DRAFT",
    readyAt: override.readyAt ?? null,
    dispatchedAt: override.dispatchedAt ?? null,
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

export function buildReadyDispatchEntity(): Dispatch {
  const now = new Date("2026-01-16T10:00:00.000Z");

  return buildDispatchEntity({
    status: "READY",
    readyAt: now,
    updatedAt: now,
  });
}

export function buildDispatchedDispatchEntity(): Dispatch {
  const readyAt = new Date("2026-01-16T10:00:00.000Z");
  const dispatchedAt = new Date("2026-01-17T10:00:00.000Z");

  return buildDispatchEntity({
    status: "DISPATCHED",
    readyAt,
    dispatchedAt,
    updatedAt: dispatchedAt,
  });
}

export function buildCompletedDispatchEntity(): Dispatch {
  const readyAt = new Date("2026-01-16T10:00:00.000Z");
  const dispatchedAt = new Date("2026-01-17T10:00:00.000Z");
  const completedAt = new Date("2026-01-18T10:00:00.000Z");

  return buildDispatchEntity({
    status: "COMPLETED",
    readyAt,
    dispatchedAt,
    completedAt,
    updatedAt: completedAt,
  });
}
