import type { ReturnInspectionId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { ReturnStatus } from "./return.constants";
import {
  createReturnNumber,
} from "./return.errors";
import {
  applyInspectionToItems,
  assertCanCancel,
  assertCanComplete,
  assertCanInspect,
  assertCanReceive,
  assertCanUpdate,
  normalizeReturnProps,
  validateReturnDate,
  validateReturnItems,
} from "./return.rules";
import type {
  CreateReturnData,
  InspectReturnItemData,
  ReturnItemProps,
  ReturnProps,
} from "./return.types";

export class Return implements Entity<ReturnInspectionId> {
  readonly id: ReturnInspectionId;
  readonly returnNumber: string;
  readonly rentalOrderId: ReturnProps["rentalOrderId"];
  readonly dispatchId: ReturnProps["dispatchId"];
  readonly returnDate: Date;
  readonly remarks: string | null;
  readonly status: ReturnStatus;
  readonly receivedAt: Date | null;
  readonly inspectedAt: Date | null;
  readonly completedAt: Date | null;
  readonly items: ReturnItemProps[];
  readonly createdById: ReturnProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ReturnProps) {
    const normalized = normalizeReturnProps(props);

    this.id = normalized.id;
    this.returnNumber = normalized.returnNumber;
    this.rentalOrderId = normalized.rentalOrderId;
    this.dispatchId = normalized.dispatchId;
    this.returnDate = normalized.returnDate;
    this.remarks = normalized.remarks;
    this.status = normalized.status;
    this.receivedAt = normalized.receivedAt;
    this.inspectedAt = normalized.inspectedAt;
    this.completedAt = normalized.completedAt;
    this.items = normalized.items;
    this.createdById = normalized.createdById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateReturnData,
  ): Omit<
    ReturnProps,
    "id" | "status" | "receivedAt" | "inspectedAt" | "completedAt" | "createdAt" | "updatedAt"
  > {
    validateReturnDate(data.returnDate);

    return {
      returnNumber: createReturnNumber(data.returnNumber),
      rentalOrderId: data.rentalOrderId,
      dispatchId: data.dispatchId,
      returnDate: data.returnDate,
      remarks: normalizeOptionalText(data.remarks),
      items: validateReturnItems(data.items),
      createdById: data.createdById,
    };
  }

  static reconstitute(props: ReturnProps): Return {
    return new Return(props);
  }

  toProps(): ReturnProps {
    return {
      id: this.id,
      returnNumber: this.returnNumber,
      rentalOrderId: this.rentalOrderId,
      dispatchId: this.dispatchId,
      returnDate: this.returnDate,
      remarks: this.remarks,
      status: this.status,
      receivedAt: this.receivedAt,
      inspectedAt: this.inspectedAt,
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

  withReceived(): Return {
    assertCanReceive(this.status);
    const now = new Date();

    return Return.reconstitute({
      ...this.toProps(),
      status: "RECEIVED",
      receivedAt: now,
      updatedAt: now,
    });
  }

  withInspected(inspectItems: InspectReturnItemData[]): Return {
    assertCanInspect(this.status);
    const now = new Date();

    return Return.reconstitute({
      ...this.toProps(),
      status: "INSPECTED",
      inspectedAt: now,
      items: applyInspectionToItems(this.items, inspectItems),
      updatedAt: now,
    });
  }

  withCompleted(): Return {
    assertCanComplete(this.status);
    const now = new Date();

    return Return.reconstitute({
      ...this.toProps(),
      status: "COMPLETED",
      completedAt: now,
      updatedAt: now,
    });
  }

  withCancelled(): Return {
    assertCanCancel(this.status);

    return Return.reconstitute({
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
