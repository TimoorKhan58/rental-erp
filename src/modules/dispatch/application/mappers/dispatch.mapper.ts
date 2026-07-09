import { Dispatch } from "@/modules/dispatch/domain";
import type {
  CreateDispatchData,
  UpdateDispatchData,
} from "@/modules/dispatch/domain";
import type {
  DispatchId,
  ProductId,
  RentalOrderId,
  UserId,
} from "@/shared/domain/ids";

import type { DispatchDto } from "../dtos/dispatch.dto";
import type {
  CreateDispatchInput,
  UpdateDispatchInput,
} from "../schemas/dispatch.schemas";

export function toDispatchId(id: string): DispatchId {
  return id as DispatchId;
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

export function toCreateDispatchData(
  input: CreateDispatchInput,
  createdById: UserId,
): CreateDispatchData {
  return {
    dispatchNumber: input.dispatchNumber,
    rentalOrderId: toRentalOrderId(input.rentalOrderId),
    dispatchDate: input.dispatchDate,
    deliveryMethod: input.deliveryMethod,
    vehicleNumber: input.vehicleNumber,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    deliveryAddress: input.deliveryAddress,
    remarks: input.remarks,
    items: input.items.map((item) => ({
      productId: toProductId(item.productId),
      rentalOrderItemId: item.rentalOrderItemId ?? null,
      quantity: item.quantity,
      notes: item.notes,
    })),
    createdById,
  };
}

export function toUpdateDispatchData(input: UpdateDispatchInput): UpdateDispatchData {
  return {
    dispatchDate: input.dispatchDate,
    deliveryMethod: input.deliveryMethod,
    vehicleNumber: input.vehicleNumber,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    deliveryAddress: input.deliveryAddress,
    remarks: input.remarks,
    markReady: input.markReady,
    items: input.items?.map((item) => ({
      productId: toProductId(item.productId),
      rentalOrderItemId: item.rentalOrderItemId ?? null,
      quantity: item.quantity,
      notes: item.notes,
    })),
  };
}

export function toDispatchDto(dispatch: Dispatch): DispatchDto {
  const props = dispatch.toProps();

  return {
    id: props.id,
    dispatchNumber: props.dispatchNumber,
    rentalOrderId: props.rentalOrderId,
    dispatchDate: props.dispatchDate.toISOString(),
    deliveryMethod: props.deliveryMethod,
    vehicleNumber: props.vehicleNumber,
    driverName: props.driverName,
    driverPhone: props.driverPhone,
    deliveryAddress: props.deliveryAddress,
    remarks: props.remarks,
    status: props.status,
    readyAt: props.readyAt?.toISOString() ?? null,
    dispatchedAt: props.dispatchedAt?.toISOString() ?? null,
    completedAt: props.completedAt?.toISOString() ?? null,
    items: props.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      rentalOrderItemId: item.rentalOrderItemId,
      quantity: item.quantity,
      notes: item.notes,
    })),
    createdById: props.createdById,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}
