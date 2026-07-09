import type { RepairStatus } from "./repair.constants";
import { COMPLETED_RETURN_STATUS } from "./repair.constants";
import {
  RepairInvalidItemError,
  RepairInvalidStatusError,
  RepairInvariantError,
  createRepairNumber,
} from "./repair.errors";
import type { CreateRepairData, RepairProps } from "./repair.types";

export function validateRepairQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new RepairInvariantError(
      "Repair quantity must be greater than zero",
      "quantity",
    );
  }
}

export function validateRepairCost(repairCost: number): void {
  if (repairCost < 0) {
    throw new RepairInvariantError(
      "Repair cost cannot be negative",
      "repairCost",
    );
  }
}

export function validateRepairDate(repairDate: Date): void {
  if (Number.isNaN(repairDate.getTime())) {
    throw new RepairInvariantError("Invalid repair date", "repairDate");
  }
}

export function assertCanUpdate(status: RepairStatus): void {
  if (status !== "PENDING") {
    throw new RepairInvalidStatusError(status, "update");
  }
}

export function assertCanStart(status: RepairStatus): void {
  if (status !== "PENDING") {
    throw new RepairInvalidStatusError(status, "start");
  }
}

export function assertCanComplete(status: RepairStatus): void {
  if (status !== "IN_PROGRESS") {
    throw new RepairInvalidStatusError(status, "complete");
  }
}

export function assertCanCancel(status: RepairStatus): void {
  if (status === "COMPLETED" || status === "CANCELLED") {
    throw new RepairInvalidStatusError(status, "cancel");
  }
}

export function assertReturnEligibleForRepair(status: string): void {
  if (status !== COMPLETED_RETURN_STATUS) {
    throw new RepairInvalidItemError(
      `Return must be COMPLETED to create repair (current: ${status})`,
    );
  }
}

export function validateRepairQuantityAgainstReturn(
  quantity: number,
  damagedQuantity: number,
  priorRepairedQuantity: number = 0,
  returnInspectionItemId?: string,
): void {
  const remaining = damagedQuantity - priorRepairedQuantity;

  if (quantity > remaining) {
    throw new RepairInvalidItemError(
      "Repair quantity exceeds remaining damaged quantity",
      returnInspectionItemId,
    );
  }

  if (damagedQuantity <= 0) {
    throw new RepairInvalidItemError(
      "Return item has no damaged quantity available for repair",
      returnInspectionItemId,
    );
  }
}

export function normalizeRepairProps(props: RepairProps): RepairProps {
  validateRepairDate(props.repairDate);
  validateRepairQuantity(props.quantity);
  validateRepairCost(props.repairCost);

  return {
    ...props,
    repairNumber: createRepairNumber(props.repairNumber),
    repairNotes: normalizeOptionalText(props.repairNotes),
    technician: normalizeOptionalText(props.technician),
  };
}

export function normalizeCreateRepairData(
  data: CreateRepairData,
): Omit<
  RepairProps,
  "id" | "status" | "startedAt" | "completedAt" | "createdAt" | "updatedAt"
> {
  validateRepairDate(data.repairDate);
  validateRepairQuantity(data.quantity);
  validateRepairCost(data.repairCost);

  return {
    repairNumber: createRepairNumber(data.repairNumber),
    returnId: data.returnId,
    returnItemId: data.returnItemId,
    productId: data.productId,
    warehouseId: data.warehouseId,
    quantity: data.quantity,
    repairCost: data.repairCost,
    repairNotes: normalizeOptionalText(data.repairNotes),
    technician: normalizeOptionalText(data.technician),
    repairDate: data.repairDate,
    createdById: data.createdById,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
