import { Maintenance } from "@/modules/maintenance/domain";
import type {
  CreateMaintenanceData,
  UpdateMaintenanceData,
} from "@/modules/maintenance/domain";
import type {
  InventoryId,
  MaintenanceId,
  ProductId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import type {
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
} from "../schemas/maintenance.schemas";

export function toMaintenanceId(id: string): MaintenanceId {
  return id as MaintenanceId;
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}

export function toWarehouseId(id: string): WarehouseId {
  return id as WarehouseId;
}

export function toInventoryId(id: string): InventoryId {
  return id as InventoryId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toCreateMaintenanceData(
  input: CreateMaintenanceInput,
  createdById: UserId,
): CreateMaintenanceData {
  return {
    maintenanceNumber: input.maintenanceNumber,
    productId: toProductId(input.productId),
    warehouseId: toWarehouseId(input.warehouseId),
    inventoryId: toInventoryId(input.inventoryId),
    quantity: input.quantity,
    serviceType: input.serviceType,
    technician: input.technician,
    vendor: input.vendor,
    scheduledDate: input.scheduledDate,
    estimatedCost: input.estimatedCost,
    actualCost: input.actualCost,
    notes: input.notes,
    createdById,
  };
}

export function toUpdateMaintenanceData(
  input: UpdateMaintenanceInput,
): UpdateMaintenanceData {
  return {
    quantity: input.quantity,
    serviceType: input.serviceType,
    technician: input.technician,
    vendor: input.vendor,
    scheduledDate: input.scheduledDate,
    estimatedCost: input.estimatedCost,
    actualCost: input.actualCost,
    notes: input.notes,
  };
}

export function toMaintenanceDto(maintenance: Maintenance): MaintenanceDto {
  const props = maintenance.toProps();

  return {
    id: props.id,
    maintenanceNumber: props.maintenanceNumber,
    productId: props.productId,
    warehouseId: props.warehouseId,
    inventoryId: props.inventoryId,
    quantity: props.quantity,
    serviceType: props.serviceType,
    technician: props.technician,
    vendor: props.vendor,
    scheduledDate: props.scheduledDate.toISOString(),
    startedAt: props.startedAt?.toISOString() ?? null,
    completedAt: props.completedAt?.toISOString() ?? null,
    estimatedCost: props.estimatedCost,
    actualCost: props.actualCost,
    notes: props.notes,
    status: props.status,
    createdById: props.createdById,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}
