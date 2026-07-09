import type { RepairDto } from "@/modules/repair/application/dtos/repair.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface RepairResponse {
  id: string;
  repairNumber: string;
  returnId: string;
  returnItemId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  repairCost: number;
  repairNotes: string | null;
  technician: string | null;
  repairDate: string;
  status: RepairDto["status"];
  startedAt: string | null;
  completedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepairListResponse {
  items: RepairResponse[];
  meta: PaginationMeta;
}

export function toRepairResponse(dto: RepairDto): RepairResponse {
  return {
    id: dto.id,
    repairNumber: dto.repairNumber,
    returnId: dto.returnId,
    returnItemId: dto.returnItemId,
    productId: dto.productId,
    warehouseId: dto.warehouseId,
    quantity: dto.quantity,
    repairCost: dto.repairCost,
    repairNotes: dto.repairNotes,
    technician: dto.technician,
    repairDate: dto.repairDate,
    status: dto.status,
    startedAt: dto.startedAt,
    completedAt: dto.completedAt,
    createdById: dto.createdById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toRepairListResponse(
  result: PaginatedResult<RepairDto>,
): RepairListResponse {
  return {
    items: result.items.map(toRepairResponse),
    meta: result.meta,
  };
}
