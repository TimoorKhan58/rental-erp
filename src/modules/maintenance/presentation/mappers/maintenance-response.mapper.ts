import type { MaintenanceDto } from "@/modules/maintenance/application/dtos/maintenance.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface MaintenanceResponse {
  id: string;
  maintenanceNumber: string;
  productId: string;
  warehouseId: string;
  inventoryId: string;
  quantity: number;
  serviceType: MaintenanceDto["serviceType"];
  technician: string | null;
  vendor: string | null;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedCost: number;
  actualCost: number;
  notes: string | null;
  status: MaintenanceDto["status"];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceListResponse {
  items: MaintenanceResponse[];
  meta: PaginationMeta;
}

export function toMaintenanceResponse(dto: MaintenanceDto): MaintenanceResponse {
  return {
    id: dto.id,
    maintenanceNumber: dto.maintenanceNumber,
    productId: dto.productId,
    warehouseId: dto.warehouseId,
    inventoryId: dto.inventoryId,
    quantity: dto.quantity,
    serviceType: dto.serviceType,
    technician: dto.technician,
    vendor: dto.vendor,
    scheduledDate: dto.scheduledDate,
    startedAt: dto.startedAt,
    completedAt: dto.completedAt,
    estimatedCost: dto.estimatedCost,
    actualCost: dto.actualCost,
    notes: dto.notes,
    status: dto.status,
    createdById: dto.createdById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toMaintenanceListResponse(
  result: PaginatedResult<MaintenanceDto>,
): MaintenanceListResponse {
  return {
    items: result.items.map(toMaintenanceResponse),
    meta: result.meta,
  };
}
