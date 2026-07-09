import type { MaintenanceId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { MaintenanceServiceType, MaintenanceStatus } from "./maintenance.constants";
import {
  assertCanCancel,
  assertCanComplete,
  assertCanStart,
  assertCanUpdate,
  normalizeCreateMaintenanceData,
  normalizeMaintenanceProps,
  validateMaintenanceCost,
  validateMaintenanceQuantity,
  validateScheduledDate,
  validateServiceType,
} from "./maintenance.rules";
import type {
  CreateMaintenanceData,
  MaintenanceProps,
  UpdateMaintenanceData,
} from "./maintenance.types";

export class Maintenance implements Entity<MaintenanceId> {
  readonly id: MaintenanceId;
  readonly maintenanceNumber: string;
  readonly productId: MaintenanceProps["productId"];
  readonly warehouseId: MaintenanceProps["warehouseId"];
  readonly inventoryId: MaintenanceProps["inventoryId"];
  readonly quantity: number;
  readonly serviceType: MaintenanceServiceType;
  readonly technician: string | null;
  readonly vendor: string | null;
  readonly scheduledDate: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly estimatedCost: number;
  readonly actualCost: number;
  readonly notes: string | null;
  readonly status: MaintenanceStatus;
  readonly createdById: MaintenanceProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: MaintenanceProps) {
    const normalized = normalizeMaintenanceProps(props);

    this.id = normalized.id;
    this.maintenanceNumber = normalized.maintenanceNumber;
    this.productId = normalized.productId;
    this.warehouseId = normalized.warehouseId;
    this.inventoryId = normalized.inventoryId;
    this.quantity = normalized.quantity;
    this.serviceType = normalized.serviceType;
    this.technician = normalized.technician;
    this.vendor = normalized.vendor;
    this.scheduledDate = normalized.scheduledDate;
    this.startedAt = normalized.startedAt;
    this.completedAt = normalized.completedAt;
    this.estimatedCost = normalized.estimatedCost;
    this.actualCost = normalized.actualCost;
    this.notes = normalized.notes;
    this.status = normalized.status;
    this.createdById = normalized.createdById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateMaintenanceData,
  ): Omit<
    MaintenanceProps,
    "id" | "status" | "startedAt" | "completedAt" | "createdAt" | "updatedAt"
  > {
    return normalizeCreateMaintenanceData(data);
  }

  static reconstitute(props: MaintenanceProps): Maintenance {
    return new Maintenance(props);
  }

  toProps(): MaintenanceProps {
    return {
      id: this.id,
      maintenanceNumber: this.maintenanceNumber,
      productId: this.productId,
      warehouseId: this.warehouseId,
      inventoryId: this.inventoryId,
      quantity: this.quantity,
      serviceType: this.serviceType,
      technician: this.technician,
      vendor: this.vendor,
      scheduledDate: this.scheduledDate,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      estimatedCost: this.estimatedCost,
      actualCost: this.actualCost,
      notes: this.notes,
      status: this.status,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withUpdated(data: UpdateMaintenanceData): Maintenance {
    assertCanUpdate(this.status);

    const quantity = data.quantity ?? this.quantity;
    const estimatedCost = data.estimatedCost ?? this.estimatedCost;
    const actualCost = data.actualCost ?? this.actualCost;

    validateMaintenanceQuantity(quantity);
    validateMaintenanceCost(estimatedCost, "estimatedCost");
    validateMaintenanceCost(actualCost, "actualCost");

    if (data.scheduledDate !== undefined) {
      validateScheduledDate(data.scheduledDate);
    }

    if (data.serviceType !== undefined) {
      validateServiceType(data.serviceType);
    }

    return Maintenance.reconstitute({
      ...this.toProps(),
      quantity,
      serviceType: data.serviceType ?? this.serviceType,
      technician:
        data.technician !== undefined ? data.technician : this.technician,
      vendor: data.vendor !== undefined ? data.vendor : this.vendor,
      scheduledDate: data.scheduledDate ?? this.scheduledDate,
      estimatedCost,
      actualCost,
      notes: data.notes !== undefined ? data.notes : this.notes,
      updatedAt: new Date(),
    });
  }

  withStarted(): Maintenance {
    assertCanStart(this.status);
    const now = new Date();

    return Maintenance.reconstitute({
      ...this.toProps(),
      status: "IN_PROGRESS",
      startedAt: now,
      updatedAt: now,
    });
  }

  withCompleted(): Maintenance {
    assertCanComplete(this.status);
    const now = new Date();

    return Maintenance.reconstitute({
      ...this.toProps(),
      status: "COMPLETED",
      completedAt: now,
      updatedAt: now,
    });
  }

  withCancelled(): Maintenance {
    assertCanCancel(this.status);

    return Maintenance.reconstitute({
      ...this.toProps(),
      status: "CANCELLED",
      updatedAt: new Date(),
    });
  }
}
