import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaNamespace } from "@/generated/prisma/client";
import { Repair } from "@/modules/repair/domain";
import {
  REPAIR_STATUSES,
  type RepairStatus,
} from "@/modules/repair/domain";
import type {
  CreateRepairData,
  UpdateRepairData,
  UpdateRepairStatusData,
} from "@/modules/repair/domain";
import type {
  ProductId,
  RepairId,
  ReturnInspectionId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

function toDomainStatus(status: string): RepairStatus {
  if ((REPAIR_STATUSES as readonly string[]).includes(status)) {
    return status as RepairStatus;
  }

  throw new Error(`Unsupported repair status for module: ${status}`);
}

function decimalToNumber(value: PrismaNamespace.Decimal): number {
  return Number(value.toString());
}

export function toRepairDomain(record: {
  id: string;
  repairNumber: string;
  returnInspectionId: string;
  returnInspectionItemId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  repairDate: Date;
  assignedTo: string | null;
  actualCost: PrismaNamespace.Decimal;
  remarks: string | null;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): Repair {
  return Repair.reconstitute({
    id: record.id as RepairId,
    repairNumber: record.repairNumber,
    returnId: record.returnInspectionId as ReturnInspectionId,
    returnItemId: record.returnInspectionItemId,
    productId: record.productId as ProductId,
    warehouseId: record.warehouseId as WarehouseId,
    quantity: record.quantity,
    repairCost: decimalToNumber(record.actualCost),
    repairNotes: record.remarks,
    technician: record.assignedTo,
    repairDate: record.repairDate,
    status: toDomainStatus(record.status),
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toRepairCreateInput(
  data: CreateRepairData,
): Prisma.RepairCreateInput {
  const normalized = Repair.create(data);

  return {
    repairNumber: normalized.repairNumber,
    returnInspection: { connect: { id: normalized.returnId } },
    returnInspectionItemId: normalized.returnItemId,
    product: { connect: { id: normalized.productId } },
    warehouse: { connect: { id: normalized.warehouseId } },
    quantity: normalized.quantity,
    repairDate: normalized.repairDate,
    assignedTo: normalized.technician,
    estimatedCost: new PrismaNamespace.Decimal(normalized.repairCost),
    actualCost: new PrismaNamespace.Decimal(normalized.repairCost),
    remarks: normalized.repairNotes,
    status: "PENDING",
    createdBy: { connect: { id: normalized.createdById } },
    items: {
      create: {
        product: { connect: { id: normalized.productId } },
        quantity: normalized.quantity,
        repairType: "OTHER",
        repairCost: new PrismaNamespace.Decimal(normalized.repairCost),
        remarks: normalized.repairNotes,
      },
    },
  };
}

export function toRepairUpdateInput(
  data: UpdateRepairData,
): Prisma.RepairUpdateInput {
  const update: Prisma.RepairUpdateInput = {};

  if (data.repairDate !== undefined) {
    update.repairDate = data.repairDate;
  }

  if (data.repairNotes !== undefined) {
    update.remarks = data.repairNotes;
  }

  if (data.technician !== undefined) {
    update.assignedTo = data.technician;
  }

  if (data.repairCost !== undefined) {
    update.actualCost = new PrismaNamespace.Decimal(data.repairCost);
    update.estimatedCost = new PrismaNamespace.Decimal(data.repairCost);
  }

  if (data.quantity !== undefined) {
    update.quantity = data.quantity;
  }

  return update;
}

export function toRepairStatusUpdateInput(
  data: UpdateRepairStatusData,
): Prisma.RepairUpdateInput {
  const update: Prisma.RepairUpdateInput = {
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

export const REPAIR_INCLUDE = {} as const satisfies Prisma.RepairInclude;
