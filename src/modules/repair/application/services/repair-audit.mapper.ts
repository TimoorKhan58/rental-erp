import type { Repair } from "@/modules/repair/domain";

export function toRepairAuditValues(repair: Repair): Record<string, unknown> {
  const props = repair.toProps();

  return {
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
  };
}
