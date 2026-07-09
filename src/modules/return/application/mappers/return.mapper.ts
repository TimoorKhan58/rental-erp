import { Return } from "@/modules/return/domain";
import type {
  CreateReturnData,
  InspectReturnItemData,
  UpdateReturnData,
} from "@/modules/return/domain";
import type {
  DispatchId,
  ProductId,
  RentalOrderId,
  ReturnInspectionId,
  UserId,
} from "@/shared/domain/ids";

import type { ReturnDto } from "../dtos/return.dto";
import type {
  CreateReturnInput,
  InspectReturnInput,
  UpdateReturnInput,
} from "../schemas/return.schemas";

export function toReturnId(id: string): ReturnInspectionId {
  return id as ReturnInspectionId;
}

export function toRentalOrderId(id: string): RentalOrderId {
  return id as RentalOrderId;
}

export function toDispatchId(id: string): DispatchId {
  return id as DispatchId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}

export function toCreateReturnData(
  input: CreateReturnInput,
  createdById: UserId,
): CreateReturnData {
  return {
    returnNumber: input.returnNumber,
    rentalOrderId: toRentalOrderId(input.rentalOrderId),
    dispatchId: toDispatchId(input.dispatchId),
    returnDate: input.returnDate,
    remarks: input.remarks,
    items: input.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId ?? null,
      quantity: item.quantity,
      notes: item.notes,
    })),
    createdById,
  };
}

export function toUpdateReturnData(input: UpdateReturnInput): UpdateReturnData {
  return {
    returnDate: input.returnDate,
    remarks: input.remarks,
    items: input.items?.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId ?? null,
      quantity: item.quantity,
      notes: item.notes,
    })),
  };
}

export function toInspectReturnItems(
  input: InspectReturnInput,
): InspectReturnItemData[] {
  return input.items.map((item) => ({
    rentalOrderItemId: item.rentalOrderItemId,
    goodQuantity: item.goodQuantity,
    damagedQuantity: item.damagedQuantity,
    lostQuantity: item.lostQuantity,
    notes: item.notes,
  }));
}

export function toReturnDto(returnRecord: Return): ReturnDto {
  const props = returnRecord.toProps();

  return {
    id: props.id,
    returnNumber: props.returnNumber,
    rentalOrderId: props.rentalOrderId,
    dispatchId: props.dispatchId,
    returnDate: props.returnDate.toISOString(),
    remarks: props.remarks,
    status: props.status,
    receivedAt: props.receivedAt?.toISOString() ?? null,
    inspectedAt: props.inspectedAt?.toISOString() ?? null,
    completedAt: props.completedAt?.toISOString() ?? null,
    items: props.items.map((item) => ({
      id: item.id,
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId,
      returnedQuantity: item.returnedQuantity,
      goodQuantity: item.goodQuantity,
      damagedQuantity: item.damagedQuantity,
      lostQuantity: item.lostQuantity,
      notes: item.notes,
    })),
    createdById: props.createdById,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}
