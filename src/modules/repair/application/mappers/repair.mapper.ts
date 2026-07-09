import { Repair } from "@/modules/repair/domain";
import type { CreateRepairData, UpdateRepairData } from "@/modules/repair/domain";
import type {
  ProductId,
  RepairId,
  ReturnInspectionId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { RepairDto } from "../dtos/repair.dto";
import type {
  CreateRepairInput,
  UpdateRepairInput,
} from "../schemas/repair.schemas";

export function toRepairId(id: string): RepairId {
  return id as RepairId;
}

export function toReturnId(id: string): ReturnInspectionId {
  return id as ReturnInspectionId;
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}

export function toWarehouseId(id: string): WarehouseId {
  return id as WarehouseId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toCreateRepairData(
  input: CreateRepairInput,
  createdById: UserId,
): CreateRepairData {
  return {
    repairNumber: input.repairNumber,
    returnId: toReturnId(input.returnId),
    returnItemId: input.returnItemId,
    productId: toProductId(input.productId),
    warehouseId: toWarehouseId(input.warehouseId),
    quantity: input.quantity,
    repairCost: input.repairCost,
    repairNotes: input.repairNotes,
    technician: input.technician,
    repairDate: input.repairDate,
    createdById,
  };
}

export function toUpdateRepairData(input: UpdateRepairInput): UpdateRepairData {
  return {
    repairCost: input.repairCost,
    repairNotes: input.repairNotes,
    technician: input.technician,
    repairDate: input.repairDate,
    quantity: input.quantity,
  };
}

export function toRepairDto(repair: Repair): RepairDto {
  const props = repair.toProps();

  return {
    id: props.id,
    repairNumber: props.repairNumber,
    returnId: props.returnId,
    returnItemId: props.returnItemId,
    productId: props.productId,
    warehouseId: props.warehouseId,
    quantity: props.quantity,
    repairCost: props.repairCost,
    repairNotes: props.repairNotes,
    technician: props.technician,
    repairDate: props.repairDate.toISOString(),
    status: props.status,
    startedAt: props.startedAt?.toISOString() ?? null,
    completedAt: props.completedAt?.toISOString() ?? null,
    createdById: props.createdById,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}
