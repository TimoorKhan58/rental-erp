import type { RepairId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { RepairStatus } from "./repair.constants";
import {
  assertCanCancel,
  assertCanComplete,
  assertCanStart,
  assertCanUpdate,
  normalizeCreateRepairData,
  normalizeRepairProps,
  validateRepairCost,
  validateRepairDate,
  validateRepairQuantity,
} from "./repair.rules";
import type { CreateRepairData, RepairProps, UpdateRepairData } from "./repair.types";

export class Repair implements Entity<RepairId> {
  readonly id: RepairId;
  readonly repairNumber: string;
  readonly returnId: RepairProps["returnId"];
  readonly returnItemId: string;
  readonly productId: RepairProps["productId"];
  readonly warehouseId: RepairProps["warehouseId"];
  readonly quantity: number;
  readonly repairCost: number;
  readonly repairNotes: string | null;
  readonly technician: string | null;
  readonly repairDate: Date;
  readonly status: RepairStatus;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdById: RepairProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: RepairProps) {
    const normalized = normalizeRepairProps(props);

    this.id = normalized.id;
    this.repairNumber = normalized.repairNumber;
    this.returnId = normalized.returnId;
    this.returnItemId = normalized.returnItemId;
    this.productId = normalized.productId;
    this.warehouseId = normalized.warehouseId;
    this.quantity = normalized.quantity;
    this.repairCost = normalized.repairCost;
    this.repairNotes = normalized.repairNotes;
    this.technician = normalized.technician;
    this.repairDate = normalized.repairDate;
    this.status = normalized.status;
    this.startedAt = normalized.startedAt;
    this.completedAt = normalized.completedAt;
    this.createdById = normalized.createdById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateRepairData,
  ): Omit<
    RepairProps,
    "id" | "status" | "startedAt" | "completedAt" | "createdAt" | "updatedAt"
  > {
    return normalizeCreateRepairData(data);
  }

  static reconstitute(props: RepairProps): Repair {
    return new Repair(props);
  }

  toProps(): RepairProps {
    return {
      id: this.id,
      repairNumber: this.repairNumber,
      returnId: this.returnId,
      returnItemId: this.returnItemId,
      productId: this.productId,
      warehouseId: this.warehouseId,
      quantity: this.quantity,
      repairCost: this.repairCost,
      repairNotes: this.repairNotes,
      technician: this.technician,
      repairDate: this.repairDate,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withUpdated(data: UpdateRepairData): Repair {
    assertCanUpdate(this.status);

    const quantity = data.quantity ?? this.quantity;
    const repairCost = data.repairCost ?? this.repairCost;

    validateRepairQuantity(quantity);
    validateRepairCost(repairCost);

    if (data.repairDate !== undefined) {
      validateRepairDate(data.repairDate);
    }

    return Repair.reconstitute({
      ...this.toProps(),
      quantity,
      repairCost,
      repairNotes:
        data.repairNotes !== undefined ? data.repairNotes : this.repairNotes,
      technician:
        data.technician !== undefined ? data.technician : this.technician,
      repairDate: data.repairDate ?? this.repairDate,
      updatedAt: new Date(),
    });
  }

  withStarted(): Repair {
    assertCanStart(this.status);
    const now = new Date();

    return Repair.reconstitute({
      ...this.toProps(),
      status: "IN_PROGRESS",
      startedAt: now,
      updatedAt: now,
    });
  }

  withCompleted(): Repair {
    assertCanComplete(this.status);
    const now = new Date();

    return Repair.reconstitute({
      ...this.toProps(),
      status: "COMPLETED",
      completedAt: now,
      updatedAt: now,
    });
  }

  withCancelled(): Repair {
    assertCanCancel(this.status);

    return Repair.reconstitute({
      ...this.toProps(),
      status: "CANCELLED",
      updatedAt: new Date(),
    });
  }
}
