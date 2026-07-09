import { Repair } from "@/modules/repair/domain/repair.entity";
import type { CreateRepairData } from "@/modules/repair/domain/repair.types";
import {
  ITEM_ID,
  PRODUCT_ID,
  RETURN_ID,
  USER_ID,
  WAREHOUSE_ID,
  buildInspectedReturnEntity,
} from "@/modules/return/tests/helpers/return.fixtures";
import type { RepairId } from "@/shared/domain/ids";
import type { Return } from "@/modules/return/domain/return.entity";

export {
  ITEM_ID,
  PRODUCT_ID,
  RETURN_ID,
  USER_ID,
  WAREHOUSE_ID,
};

export const REPAIR_ID =
  "ff0e8400-e29b-41d4-a716-446655440000" as RepairId;

export const OTHER_REPAIR_ID =
  "ff0e8400-e29b-41d4-a716-446655440001" as RepairId;

export const VALID_CREATE_INPUT = {
  repairNumber: "RPR-2026-001",
  returnId: RETURN_ID,
  returnItemId: ITEM_ID,
  productId: PRODUCT_ID,
  warehouseId: WAREHOUSE_ID,
  quantity: 1,
  repairCost: 50,
  repairNotes: "Replace damaged casing",
  technician: "Tech A",
  repairDate: "2026-02-15T00:00:00.000Z",
};

export function buildCreateRepairData(
  override: Partial<CreateRepairData> = {},
): CreateRepairData {
  return {
    repairNumber: VALID_CREATE_INPUT.repairNumber,
    returnId: RETURN_ID,
    returnItemId: ITEM_ID,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    quantity: VALID_CREATE_INPUT.quantity,
    repairCost: VALID_CREATE_INPUT.repairCost,
    repairNotes: VALID_CREATE_INPUT.repairNotes,
    technician: VALID_CREATE_INPUT.technician,
    repairDate: new Date(VALID_CREATE_INPUT.repairDate),
    createdById: USER_ID,
    ...override,
  };
}

export function buildCompletedReturnForRepair(
  options: {
    damagedQuantity?: number;
    goodQuantity?: number;
    lostQuantity?: number;
  } = {},
): Return {
  return buildInspectedReturnEntity({
    damagedQuantity: options.damagedQuantity ?? 2,
    goodQuantity: options.goodQuantity ?? 3,
    lostQuantity: options.lostQuantity ?? 0,
  }).withCompleted();
}

export function buildRepairEntity(
  override: {
    id?: RepairId;
    status?: Repair["status"];
    quantity?: number;
    repairCost?: number;
    repairNotes?: string | null;
    technician?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Repair {
  const created = Repair.create(buildCreateRepairData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Repair.reconstitute({
    id: override.id ?? REPAIR_ID,
    repairNumber: created.repairNumber,
    returnId: created.returnId,
    returnItemId: created.returnItemId,
    productId: created.productId,
    warehouseId: created.warehouseId,
    quantity: override.quantity ?? created.quantity,
    repairCost: override.repairCost ?? created.repairCost,
    repairNotes:
      override.repairNotes !== undefined
        ? override.repairNotes
        : created.repairNotes,
    technician:
      override.technician !== undefined
        ? override.technician
        : created.technician,
    repairDate: created.repairDate,
    status: override.status ?? "PENDING",
    startedAt: override.startedAt ?? null,
    completedAt: override.completedAt ?? null,
    createdById: created.createdById,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildInProgressRepairEntity(): Repair {
  const pending = buildRepairEntity();
  const now = new Date("2026-01-18T10:00:00.000Z");

  return Repair.reconstitute({
    ...pending.toProps(),
    status: "IN_PROGRESS",
    startedAt: now,
    updatedAt: now,
  });
}

export function buildCompletedRepairEntity(): Repair {
  const inProgress = buildInProgressRepairEntity();
  const now = new Date("2026-01-20T10:00:00.000Z");

  return Repair.reconstitute({
    ...inProgress.toProps(),
    status: "COMPLETED",
    completedAt: now,
    updatedAt: now,
  });
}
