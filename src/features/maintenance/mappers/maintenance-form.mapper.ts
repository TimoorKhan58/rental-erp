import type {
  CreateMaintenanceFormValues,
  UpdateMaintenanceFormValues,
} from "../schemas";
import type {
  CreateMaintenancePayload,
  MaintenanceResponse,
  UpdateMaintenancePayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function toCreateMaintenancePayload(
  values: CreateMaintenanceFormValues,
): CreateMaintenancePayload {
  return {
    maintenanceNumber: values.maintenanceNumber.trim(),
    productId: values.productId,
    warehouseId: values.warehouseId,
    inventoryId: values.inventoryId,
    quantity: values.quantity,
    serviceType: values.serviceType,
    scheduledDate: values.scheduledDate,
    estimatedCost: values.estimatedCost,
    actualCost: values.actualCost ?? 0,
    technician: normalizeOptionalString(values.technician),
    vendor: normalizeOptionalString(values.vendor),
    notes: normalizeOptionalString(values.notes),
  };
}

export function toUpdateMaintenancePayload(
  values: UpdateMaintenanceFormValues,
): UpdateMaintenancePayload {
  return {
    quantity: values.quantity,
    serviceType: values.serviceType,
    scheduledDate: values.scheduledDate,
    estimatedCost: values.estimatedCost,
    actualCost: values.actualCost,
    technician: normalizeOptionalString(values.technician),
    vendor: normalizeOptionalString(values.vendor),
    notes: normalizeOptionalString(values.notes),
  };
}

export function toMaintenanceFormValues(
  maintenance: MaintenanceResponse,
): UpdateMaintenanceFormValues {
  return {
    quantity: maintenance.quantity,
    serviceType: maintenance.serviceType,
    scheduledDate: maintenance.scheduledDate,
    estimatedCost: maintenance.estimatedCost,
    actualCost: maintenance.actualCost,
    technician: maintenance.technician ?? "",
    vendor: maintenance.vendor ?? "",
    notes: maintenance.notes ?? "",
  };
}
