import { Maintenance } from "@/modules/maintenance/domain/maintenance.entity";
import type { CreateMaintenanceData } from "@/modules/maintenance/domain/maintenance.types";
import {
  INVENTORY_ID,
  PRODUCT_ID,
  USER_ID,
  WAREHOUSE_ID,
} from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import type { MaintenanceId } from "@/shared/domain/ids";

export { INVENTORY_ID, PRODUCT_ID, USER_ID, WAREHOUSE_ID };

export const MAINTENANCE_ID =
  "aa0e8400-e29b-41d4-a716-446655440000" as MaintenanceId;

export const OTHER_MAINTENANCE_ID =
  "aa0e8400-e29b-41d4-a716-446655440001" as MaintenanceId;

export const VALID_CREATE_INPUT = {
  maintenanceNumber: "MNT-2026-001",
  productId: PRODUCT_ID,
  warehouseId: WAREHOUSE_ID,
  inventoryId: INVENTORY_ID,
  quantity: 2,
  serviceType: "PREVENTIVE" as const,
  technician: "Tech A",
  vendor: "Vendor X",
  scheduledDate: "2026-02-15T00:00:00.000Z",
  estimatedCost: 100,
  actualCost: 0,
  notes: "Routine preventive maintenance",
};

export function buildCreateMaintenanceData(
  override: Partial<CreateMaintenanceData> = {},
): CreateMaintenanceData {
  return {
    maintenanceNumber: VALID_CREATE_INPUT.maintenanceNumber,
    productId: PRODUCT_ID,
    warehouseId: WAREHOUSE_ID,
    inventoryId: INVENTORY_ID,
    quantity: VALID_CREATE_INPUT.quantity,
    serviceType: VALID_CREATE_INPUT.serviceType,
    technician: VALID_CREATE_INPUT.technician,
    vendor: VALID_CREATE_INPUT.vendor,
    scheduledDate: new Date(VALID_CREATE_INPUT.scheduledDate),
    estimatedCost: VALID_CREATE_INPUT.estimatedCost,
    actualCost: VALID_CREATE_INPUT.actualCost,
    notes: VALID_CREATE_INPUT.notes,
    createdById: USER_ID,
    ...override,
  };
}

export function buildMaintenanceEntity(
  override: {
    id?: MaintenanceId;
    status?: Maintenance["status"];
    quantity?: number;
    estimatedCost?: number;
    actualCost?: number;
    notes?: string | null;
    technician?: string | null;
    vendor?: string | null;
    serviceType?: Maintenance["serviceType"];
    startedAt?: Date | null;
    completedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Maintenance {
  const created = Maintenance.create(buildCreateMaintenanceData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Maintenance.reconstitute({
    id: override.id ?? MAINTENANCE_ID,
    maintenanceNumber: created.maintenanceNumber,
    productId: created.productId,
    warehouseId: created.warehouseId,
    inventoryId: created.inventoryId,
    quantity: override.quantity ?? created.quantity,
    serviceType: override.serviceType ?? created.serviceType,
    technician:
      override.technician !== undefined
        ? override.technician
        : created.technician,
    vendor: override.vendor !== undefined ? override.vendor : created.vendor,
    scheduledDate: created.scheduledDate,
    estimatedCost: override.estimatedCost ?? created.estimatedCost,
    actualCost: override.actualCost ?? created.actualCost,
    notes: override.notes !== undefined ? override.notes : created.notes,
    status: override.status ?? "SCHEDULED",
    startedAt: override.startedAt ?? null,
    completedAt: override.completedAt ?? null,
    createdById: created.createdById,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildInProgressMaintenanceEntity(): Maintenance {
  const scheduled = buildMaintenanceEntity();
  const now = new Date("2026-01-18T10:00:00.000Z");

  return Maintenance.reconstitute({
    ...scheduled.toProps(),
    status: "IN_PROGRESS",
    startedAt: now,
    updatedAt: now,
  });
}

export function buildCompletedMaintenanceEntity(): Maintenance {
  const inProgress = buildInProgressMaintenanceEntity();
  const now = new Date("2026-01-20T10:00:00.000Z");

  return Maintenance.reconstitute({
    ...inProgress.toProps(),
    status: "COMPLETED",
    completedAt: now,
    updatedAt: now,
  });
}
