import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type {
  CreateRentalOrderData,
  UpdateRentalOrderData,
} from "@/modules/rental-order/domain/rental-order.types";
import type {
  CustomerId,
  ProductId,
  RentalOrderId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import type {
  CreateRentalOrderInput,
  UpdateRentalOrderInput,
} from "../schemas/rental-order.schemas";

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid rental date value: ${String(value)}`);
  }

  return parsed.toISOString();
}

export function toRentalOrderDto(order: RentalOrder): RentalOrderDto {
  const props = order.toProps();

  return {
    id: props.id,
    orderNumber: props.orderNumber,
    customerId: props.customerId,
    warehouseId: props.warehouseId,
    status: props.status,
    startDate: toIsoDate(props.startDate),
    endDate: toIsoDate(props.endDate),
    remarks: props.remarks,
    items: props.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      dailyRate: item.dailyRate,
      reservedQuantity: item.reservedQuantity,
      startDate: toIsoDate(item.startDate),
      endDate: toIsoDate(item.endDate),
      numberOfDays: item.numberOfDays,
    })),
    createdById: props.createdById,
    createdAt: toIsoDate(props.createdAt),
    updatedAt: toIsoDate(props.updatedAt),
  };
}

export function toCreateRentalOrderData(
  input: CreateRentalOrderInput,
  createdById: UserId,
): CreateRentalOrderData {
  return {
    orderNumber: input.orderNumber,
    customerId: input.customerId as CustomerId,
    warehouseId: input.warehouseId as WarehouseId,
    startDate: input.startDate,
    endDate: input.endDate,
    remarks: input.remarks ?? null,
    items: input.items.map((item) => ({
      productId: item.productId as ProductId,
      quantity: item.quantity,
      dailyRate: item.dailyRate,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
    createdById,
  };
}

export function toUpdateRentalOrderData(
  input: UpdateRentalOrderInput,
): UpdateRentalOrderData {
  return {
    customerId: input.customerId as CustomerId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
    startDate: input.startDate,
    endDate: input.endDate,
    remarks: input.remarks,
    items: input.items?.map((item) => ({
      productId: item.productId as ProductId,
      quantity: item.quantity,
      dailyRate: item.dailyRate,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
  };
}

export function toRentalOrderId(id: string): RentalOrderId {
  return id as RentalOrderId;
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}
