import type { Maintenance } from "@/modules/maintenance/domain";

export function toMaintenanceAuditValues(
  maintenance: Maintenance,
): Record<string, unknown> {
  const props = maintenance.toProps();

  return {
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
  };
}
