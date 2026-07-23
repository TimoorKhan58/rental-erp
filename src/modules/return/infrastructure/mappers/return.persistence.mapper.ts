import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaNamespace } from "@/generated/prisma/client";
import { Return } from "@/modules/return/domain";
import {
  RETURN_STATUSES,
  type ReturnStatus,
} from "@/modules/return/domain";
import { validateReturnItems } from "@/modules/return/domain/return.rules";
import type {
  CreateReturnData,
  UpdateReturnData,
  UpdateReturnStatusData,
} from "@/modules/return/domain";
import type {
  DispatchId,
  RentalOrderId,
  ReturnInspectionId,
  UserId,
} from "@/shared/domain/ids";

function toDomainStatus(status: string): ReturnStatus {
  if ((RETURN_STATUSES as readonly string[]).includes(status)) {
    return status as ReturnStatus;
  }

  throw new Error(`Unsupported return status for module: ${status}`);
}

export function toReturnDomain(record: {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  inspectionDate: Date;
  inspectedById: string;
  remarks: string | null;
  status: string;
  receivedAt: Date | null;
  inspectedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    rentalOrderItemId: string;
    returnedQuantity: number;
    goodQuantity: number;
    brokenQuantity: number;
    lostQuantity: number;
    missingQuantity?: number;
    notes: string | null;
  }>;
}): Return {
  return Return.reconstitute({
    id: record.id as ReturnInspectionId,
    returnNumber: record.returnNumber,
    rentalOrderId: record.rentalOrderId as RentalOrderId,
    dispatchId: record.dispatchId as DispatchId,
    returnDate: record.inspectionDate,
    remarks: record.remarks,
    status: toDomainStatus(record.status),
    receivedAt: record.receivedAt,
    inspectedAt: record.inspectedAt,
    completedAt: record.completedAt,
    items: record.items.map((item) => ({
      id: item.id,
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: null,
      returnedQuantity: item.returnedQuantity,
      goodQuantity: item.goodQuantity,
      damagedQuantity: item.brokenQuantity,
      lostQuantity: item.lostQuantity,
      missingQuantity: item.missingQuantity ?? 0,
      notes: item.notes,
    })),
    createdById: record.inspectedById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toReturnCreateInput(
  data: CreateReturnData,
): Prisma.ReturnInspectionCreateInput {
  const normalized = Return.create(data);

  return {
    returnNumber: normalized.returnNumber,
    rentalOrder: { connect: { id: normalized.rentalOrderId } },
    dispatch: { connect: { id: normalized.dispatchId } },
    inspectionDate: normalized.returnDate,
    inspectedBy: { connect: { id: normalized.createdById } },
    remarks: normalized.remarks,
    status: "DRAFT",
    items: {
      create: normalized.items.map((item) => ({
        rentalOrderItem: { connect: { id: item.rentalOrderItemId } },
        returnedQuantity: item.returnedQuantity,
        goodQuantity: 0,
        brokenQuantity: 0,
        repairQuantity: 0,
        lostQuantity: 0,
        missingQuantity: 0,
        damageCharge: new PrismaNamespace.Decimal(0),
        notes: item.notes,
      })),
    },
  };
}

export function toReturnUpdateInput(
  data: UpdateReturnData,
): Prisma.ReturnInspectionUpdateInput {
  const update: Prisma.ReturnInspectionUpdateInput = {};

  if (data.returnDate !== undefined) {
    update.inspectionDate = data.returnDate;
  }

  if (data.remarks !== undefined) {
    update.remarks = data.remarks;
  }

  if (data.items !== undefined) {
    const normalizedItems = validateReturnItems(data.items);

    update.items = {
      deleteMany: {},
      create: normalizedItems.map((item) => ({
        rentalOrderItem: { connect: { id: item.rentalOrderItemId } },
        returnedQuantity: item.returnedQuantity,
        goodQuantity: 0,
        brokenQuantity: 0,
        repairQuantity: 0,
        lostQuantity: 0,
        missingQuantity: 0,
        damageCharge: new PrismaNamespace.Decimal(0),
        notes: item.notes,
      })),
    };
  }

  return update;
}

export function toReturnStatusUpdateInput(
  data: UpdateReturnStatusData,
): Prisma.ReturnInspectionUpdateInput {
  const update: Prisma.ReturnInspectionUpdateInput = {
    status: data.status,
  };

  if (data.receivedAt !== undefined) {
    update.receivedAt = data.receivedAt;
  }

  if (data.inspectedAt !== undefined) {
    update.inspectedAt = data.inspectedAt;
  }

  if (data.completedAt !== undefined) {
    update.completedAt = data.completedAt;
  }

  if (data.items !== undefined) {
    update.items = {
      update: data.items.map((item) => ({
        where: { id: item.id },
        data: {
          goodQuantity: item.goodQuantity,
          brokenQuantity: item.damagedQuantity,
          lostQuantity: item.lostQuantity,
          missingQuantity: item.missingQuantity,
          notes: item.notes,
        },
      })),
    };
  }

  return update;
}

export const RETURN_INCLUDE = {
  items: true,
} as const satisfies Prisma.ReturnInspectionInclude;
