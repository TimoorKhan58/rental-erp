import type { MaintenanceServiceType, MaintenanceStatus } from "./maintenance.constants";
import { MAINTENANCE_SERVICE_TYPES } from "./maintenance.constants";
import {
  MaintenanceInvalidInventoryError,
  MaintenanceInvalidStatusError,
  MaintenanceInvariantError,
  createMaintenanceNumber,
} from "./maintenance.errors";
import type { CreateMaintenanceData, MaintenanceProps } from "./maintenance.types";

export function validateMaintenanceQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new MaintenanceInvariantError(
      "Maintenance quantity must be greater than zero",
      "quantity",
    );
  }
}

export function validateMaintenanceCost(cost: number, field: string): void {
  if (cost < 0) {
    throw new MaintenanceInvariantError(
      "Maintenance cost cannot be negative",
      field,
    );
  }
}

export function validateScheduledDate(scheduledDate: Date): void {
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new MaintenanceInvariantError(
      "Invalid scheduled date",
      "scheduledDate",
    );
  }
}

export function validateServiceType(serviceType: string): MaintenanceServiceType {
  if (!(MAINTENANCE_SERVICE_TYPES as readonly string[]).includes(serviceType)) {
    throw new MaintenanceInvariantError(
      "Invalid maintenance service type",
      "serviceType",
    );
  }

  return serviceType as MaintenanceServiceType;
}

export function assertCanUpdate(status: MaintenanceStatus): void {
  if (status !== "SCHEDULED") {
    throw new MaintenanceInvalidStatusError(status, "update");
  }
}

export function assertCanStart(status: MaintenanceStatus): void {
  if (status !== "SCHEDULED") {
    throw new MaintenanceInvalidStatusError(status, "start");
  }
}

export function assertCanComplete(status: MaintenanceStatus): void {
  if (status !== "IN_PROGRESS") {
    throw new MaintenanceInvalidStatusError(status, "complete");
  }
}

export function assertCanCancel(status: MaintenanceStatus): void {
  if (status === "COMPLETED" || status === "CANCELLED") {
    throw new MaintenanceInvalidStatusError(status, "cancel");
  }
}

export function validateQuantityAgainstAvailable(
  quantity: number,
  availableQuantity: number,
  inventoryId?: string,
): void {
  if (quantity > availableQuantity) {
    throw new MaintenanceInvalidInventoryError(
      "Maintenance quantity exceeds available inventory",
      inventoryId,
    );
  }
}

export function normalizeMaintenanceProps(
  props: MaintenanceProps,
): MaintenanceProps {
  validateScheduledDate(props.scheduledDate);
  validateMaintenanceQuantity(props.quantity);
  validateMaintenanceCost(props.estimatedCost, "estimatedCost");
  validateMaintenanceCost(props.actualCost, "actualCost");

  return {
    ...props,
    maintenanceNumber: createMaintenanceNumber(props.maintenanceNumber),
    serviceType: validateServiceType(props.serviceType),
    notes: normalizeOptionalText(props.notes),
    technician: normalizeOptionalText(props.technician),
    vendor: normalizeOptionalText(props.vendor),
  };
}

export function normalizeCreateMaintenanceData(
  data: CreateMaintenanceData,
): Omit<
  MaintenanceProps,
  "id" | "status" | "startedAt" | "completedAt" | "createdAt" | "updatedAt"
> {
  validateScheduledDate(data.scheduledDate);
  validateMaintenanceQuantity(data.quantity);
  validateMaintenanceCost(data.estimatedCost, "estimatedCost");
  validateMaintenanceCost(data.actualCost ?? 0, "actualCost");

  return {
    maintenanceNumber: createMaintenanceNumber(data.maintenanceNumber),
    productId: data.productId,
    warehouseId: data.warehouseId,
    inventoryId: data.inventoryId,
    quantity: data.quantity,
    serviceType: validateServiceType(data.serviceType),
    technician: normalizeOptionalText(data.technician),
    vendor: normalizeOptionalText(data.vendor),
    scheduledDate: data.scheduledDate,
    estimatedCost: data.estimatedCost,
    actualCost: data.actualCost ?? 0,
    notes: normalizeOptionalText(data.notes),
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
