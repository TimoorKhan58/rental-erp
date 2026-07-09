import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaNamespace } from "@/generated/prisma/client";
import { Maintenance } from "@/modules/maintenance/domain";
import {
  MAINTENANCE_STATUSES,
  type MaintenanceStatus,
} from "@/modules/maintenance/domain";
import type {
  CreateMaintenanceData,
  UpdateMaintenanceData,
  UpdateMaintenanceStatusData,
} from "@/modules/maintenance/domain";
import type {
  InventoryId,
  MaintenanceId,
  ProductId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

function toDomainStatus(status: string): MaintenanceStatus {
  if ((MAINTENANCE_STATUSES as readonly string[]).includes(status)) {
    return status as MaintenanceStatus;
  }

  throw new Error(`Unsupported maintenance status for module: ${status}`);
}

function decimalToNumber(value: PrismaNamespace.Decimal): number {
  return Number(value.toString());
}

export function toMaintenanceDomain(record: {
  id: string;
  maintenanceNumber: string;
  productId: string;
  warehouseId: string;
  inventoryId: string;
  quantity: number;
  serviceType: string;
  technician: string | null;
  vendor: string | null;
  scheduledDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCost: PrismaNamespace.Decimal;
  actualCost: PrismaNamespace.Decimal;
  notes: string | null;
  status: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): Maintenance {
  return Maintenance.reconstitute({
    id: record.id as MaintenanceId,
    maintenanceNumber: record.maintenanceNumber,
    productId: record.productId as ProductId,
    warehouseId: record.warehouseId as WarehouseId,
    inventoryId: record.inventoryId as InventoryId,
    quantity: record.quantity,
    serviceType: record.serviceType as Maintenance["serviceType"],
    technician: record.technician,
    vendor: record.vendor,
    scheduledDate: record.scheduledDate,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    estimatedCost: decimalToNumber(record.estimatedCost),
    actualCost: decimalToNumber(record.actualCost),
    notes: record.notes,
    status: toDomainStatus(record.status),
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toMaintenanceCreateInput(
  data: CreateMaintenanceData,
): Prisma.MaintenanceCreateInput {
  const normalized = Maintenance.create(data);

  return {
    maintenanceNumber: normalized.maintenanceNumber,
    product: { connect: { id: normalized.productId } },
    warehouse: { connect: { id: normalized.warehouseId } },
    inventory: { connect: { id: normalized.inventoryId } },
    quantity: normalized.quantity,
    serviceType: normalized.serviceType,
    technician: normalized.technician,
    vendor: normalized.vendor,
    scheduledDate: normalized.scheduledDate,
    estimatedCost: new PrismaNamespace.Decimal(normalized.estimatedCost),
    actualCost: new PrismaNamespace.Decimal(normalized.actualCost),
    notes: normalized.notes,
    status: "SCHEDULED",
    createdBy: { connect: { id: normalized.createdById } },
  };
}

export function toMaintenanceUpdateInput(
  data: UpdateMaintenanceData,
): Prisma.MaintenanceUpdateInput {
  const update: Prisma.MaintenanceUpdateInput = {};

  if (data.quantity !== undefined) {
    update.quantity = data.quantity;
  }

  if (data.serviceType !== undefined) {
    update.serviceType = data.serviceType;
  }

  if (data.technician !== undefined) {
    update.technician = data.technician;
  }

  if (data.vendor !== undefined) {
    update.vendor = data.vendor;
  }

  if (data.scheduledDate !== undefined) {
    update.scheduledDate = data.scheduledDate;
  }

  if (data.estimatedCost !== undefined) {
    update.estimatedCost = new PrismaNamespace.Decimal(data.estimatedCost);
  }

  if (data.actualCost !== undefined) {
    update.actualCost = new PrismaNamespace.Decimal(data.actualCost);
  }

  if (data.notes !== undefined) {
    update.notes = data.notes;
  }

  return update;
}

export function toMaintenanceStatusUpdateInput(
  data: UpdateMaintenanceStatusData,
): Prisma.MaintenanceUpdateInput {
  const update: Prisma.MaintenanceUpdateInput = {
    status: data.status,
  };

  if (data.startedAt !== undefined) {
    update.startedAt = data.startedAt;
  }

  if (data.completedAt !== undefined) {
    update.completedAt = data.completedAt;
  }

  return update;
}
