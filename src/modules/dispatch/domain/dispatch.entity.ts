import type { DispatchId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { DeliveryMethod, DispatchStatus } from "./dispatch.constants";
import {
  DispatchInvalidStatusError,
  createDispatchNumber,
} from "./dispatch.errors";
import {
  assertCanCancel,
  assertCanMarkReady,
  assertCanUpdate,
  normalizeDispatchProps,
  validateDeliveryAddress,
  validateDispatchDate,
  validateDispatchItems,
} from "./dispatch.rules";
import type {
  CreateDispatchData,
  DispatchItemProps,
  DispatchProps,
} from "./dispatch.types";

export class Dispatch implements Entity<DispatchId> {
  readonly id: DispatchId;
  readonly dispatchNumber: string;
  readonly rentalOrderId: DispatchProps["rentalOrderId"];
  readonly dispatchDate: Date;
  readonly deliveryMethod: DeliveryMethod;
  readonly vehicleNumber: string | null;
  readonly driverName: string | null;
  readonly driverPhone: string | null;
  readonly deliveryAddress: string;
  readonly remarks: string | null;
  readonly status: DispatchStatus;
  readonly readyAt: Date | null;
  readonly dispatchedAt: Date | null;
  readonly completedAt: Date | null;
  readonly items: DispatchItemProps[];
  readonly createdById: DispatchProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: DispatchProps) {
    const normalized = normalizeDispatchProps(props);

    this.id = normalized.id;
    this.dispatchNumber = normalized.dispatchNumber;
    this.rentalOrderId = normalized.rentalOrderId;
    this.dispatchDate = normalized.dispatchDate;
    this.deliveryMethod = normalized.deliveryMethod;
    this.vehicleNumber = normalized.vehicleNumber;
    this.driverName = normalized.driverName;
    this.driverPhone = normalized.driverPhone;
    this.deliveryAddress = normalized.deliveryAddress;
    this.remarks = normalized.remarks;
    this.status = normalized.status;
    this.readyAt = normalized.readyAt;
    this.dispatchedAt = normalized.dispatchedAt;
    this.completedAt = normalized.completedAt;
    this.items = normalized.items;
    this.createdById = normalized.createdById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateDispatchData,
  ): Omit<DispatchProps, "id" | "status" | "readyAt" | "dispatchedAt" | "completedAt" | "createdAt" | "updatedAt"> {
    validateDispatchDate(data.dispatchDate);

    return {
      dispatchNumber: createDispatchNumber(data.dispatchNumber),
      rentalOrderId: data.rentalOrderId,
      dispatchDate: data.dispatchDate,
      deliveryMethod: data.deliveryMethod,
      vehicleNumber: normalizeOptionalText(data.vehicleNumber),
      driverName: normalizeOptionalText(data.driverName),
      driverPhone: normalizeOptionalText(data.driverPhone),
      deliveryAddress: validateDeliveryAddress(data.deliveryAddress),
      remarks: normalizeOptionalText(data.remarks),
      items: validateDispatchItems(data.items),
      createdById: data.createdById,
    };
  }

  static reconstitute(props: DispatchProps): Dispatch {
    return new Dispatch(props);
  }

  toProps(): DispatchProps {
    return {
      id: this.id,
      dispatchNumber: this.dispatchNumber,
      rentalOrderId: this.rentalOrderId,
      dispatchDate: this.dispatchDate,
      deliveryMethod: this.deliveryMethod,
      vehicleNumber: this.vehicleNumber,
      driverName: this.driverName,
      driverPhone: this.driverPhone,
      deliveryAddress: this.deliveryAddress,
      remarks: this.remarks,
      status: this.status,
      readyAt: this.readyAt,
      dispatchedAt: this.dispatchedAt,
      completedAt: this.completedAt,
      items: this.items.map((item) => ({ ...item })),
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withReady(): Dispatch {
    assertCanMarkReady(this.status);
    const now = new Date();

    return Dispatch.reconstitute({
      ...this.toProps(),
      status: "READY",
      readyAt: now,
      updatedAt: now,
    });
  }

  withDispatched(): Dispatch {
    if (this.status !== "READY") {
      throw new DispatchInvalidStatusError(this.status, "dispatch");
    }

    const now = new Date();

    return Dispatch.reconstitute({
      ...this.toProps(),
      status: "DISPATCHED",
      dispatchedAt: now,
      updatedAt: now,
    });
  }

  withCompleted(): Dispatch {
    if (this.status !== "DISPATCHED") {
      throw new DispatchInvalidStatusError(this.status, "complete");
    }

    const now = new Date();

    return Dispatch.reconstitute({
      ...this.toProps(),
      status: "COMPLETED",
      completedAt: now,
      updatedAt: now,
    });
  }

  withCancelled(): Dispatch {
    assertCanCancel(this.status);

    return Dispatch.reconstitute({
      ...this.toProps(),
      status: "CANCELLED",
      updatedAt: new Date(),
    });
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
