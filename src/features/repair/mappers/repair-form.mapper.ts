import type {
  CreateRepairFormValues,
  UpdateRepairFormValues,
} from "../schemas";
import type {
  CreateRepairPayload,
  RepairResponse,
  UpdateRepairPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function toCreateRepairPayload(values: CreateRepairFormValues): CreateRepairPayload {
  return {
    repairNumber: values.repairNumber.trim(),
    returnId: values.returnId,
    returnItemId: values.returnItemId,
    productId: values.productId,
    warehouseId: values.warehouseId,
    quantity: values.quantity,
    repairCost: values.repairCost,
    repairDate: values.repairDate,
    repairNotes: normalizeOptionalString(values.repairNotes),
    technician: normalizeOptionalString(values.technician),
  };
}

export function toUpdateRepairPayload(values: UpdateRepairFormValues): UpdateRepairPayload {
  return {
    quantity: values.quantity,
    repairCost: values.repairCost,
    repairDate: values.repairDate,
    repairNotes: normalizeOptionalString(values.repairNotes),
    technician: normalizeOptionalString(values.technician),
  };
}

export function toRepairFormValues(repair: RepairResponse): UpdateRepairFormValues {
  return {
    quantity: repair.quantity,
    repairCost: repair.repairCost,
    repairDate: repair.repairDate,
    repairNotes: repair.repairNotes ?? "",
    technician: repair.technician ?? "",
  };
}

export function computePriorRepairedByItem(
  repairs: RepairResponse[],
  excludeRepairId?: string,
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const repair of repairs) {
    if (repair.status === "CANCELLED") {
      continue;
    }

    if (excludeRepairId && repair.id === excludeRepairId) {
      continue;
    }

    const current = totals.get(repair.returnItemId) ?? 0;
    totals.set(repair.returnItemId, current + repair.quantity);
  }

  return totals;
}
