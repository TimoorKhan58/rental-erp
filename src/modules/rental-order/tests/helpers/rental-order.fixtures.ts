import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type { CreateRentalOrderData } from "@/modules/rental-order/domain/rental-order.types";
import type {
  CustomerId,
  ProductId,
  RentalOrderId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

export const RENTAL_ORDER_ID =
  "cc0e8400-e29b-41d4-a716-446655440000" as RentalOrderId;

export const OTHER_RENTAL_ORDER_ID =
  "cc0e8400-e29b-41d4-a716-446655440001" as RentalOrderId;

export const CUSTOMER_ID =
  "550e8400-e29b-41d4-a716-446655440000" as CustomerId;

export const WAREHOUSE_ID =
  "880e8400-e29b-41d4-a716-446655440020" as WarehouseId;

export const PRODUCT_ID =
  "880e8400-e29b-41d4-a716-446655440010" as ProductId;

export const OTHER_PRODUCT_ID =
  "880e8400-e29b-41d4-a716-446655440011" as ProductId;

export const ITEM_ID = "dd0e8400-e29b-41d4-a716-446655440000";

export const USER_ID = "770e8400-e29b-41d4-a716-446655440000" as UserId;

export const VALID_CREATE_INPUT = {
  orderNumber: "RO-2026-001",
  customerId: CUSTOMER_ID,
  warehouseId: WAREHOUSE_ID,
  startDate: "2026-02-01T00:00:00.000Z",
  endDate: "2026-02-05T00:00:00.000Z",
  remarks: "Wedding event rental",
  items: [
    {
      productId: PRODUCT_ID,
      quantity: 10,
      dailyRate: 150,
    },
  ],
};

export function buildCreateRentalOrderData(
  override: Partial<CreateRentalOrderData> = {},
): CreateRentalOrderData {
  return {
    orderNumber: VALID_CREATE_INPUT.orderNumber,
    customerId: CUSTOMER_ID,
    warehouseId: WAREHOUSE_ID,
    startDate: new Date(VALID_CREATE_INPUT.startDate),
    endDate: new Date(VALID_CREATE_INPUT.endDate),
    remarks: VALID_CREATE_INPUT.remarks,
    items: VALID_CREATE_INPUT.items.map((item) => ({
      productId: item.productId as ProductId,
      quantity: item.quantity,
      dailyRate: item.dailyRate,
    })),
    createdById: USER_ID,
    ...override,
  };
}

export function buildRentalOrderEntity(
  override: {
    id?: RentalOrderId;
    status?: RentalOrder["status"];
    reservedQuantity?: number;
    items?: RentalOrder["items"];
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): RentalOrder {
  const created = RentalOrder.create(buildCreateRentalOrderData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return RentalOrder.reconstitute({
    id: override.id ?? RENTAL_ORDER_ID,
    orderNumber: created.orderNumber,
    customerId: created.customerId,
    warehouseId: created.warehouseId,
    status: override.status ?? "DRAFT",
    startDate: created.startDate,
    endDate: created.endDate,
    remarks: created.remarks,
    items:
      override.items ??
      created.items.map((item, index) => ({
        ...item,
        id: index === 0 ? ITEM_ID : "dd0e8400-e29b-41d4-a716-446655440001",
        reservedQuantity: override.reservedQuantity ?? 0,
      })),
    createdById: created.createdById,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildConfirmedRentalOrderEntity(): RentalOrder {
  return buildRentalOrderEntity({ status: "CONFIRMED" });
}

export function buildReservedRentalOrderEntity(): RentalOrder {
  return buildRentalOrderEntity({
    status: "RESERVED",
    reservedQuantity: 10,
  });
}

export function buildPartiallyReservedConfirmedEntity(): RentalOrder {
  return buildRentalOrderEntity({
    status: "CONFIRMED",
    reservedQuantity: 4,
  });
}
