import type { RentalOrderId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { RentalOrderStatus } from "./rental-order.constants";
import {
  createOrderNumber,
} from "./rental-order.errors";
import {
  applyReserveToItems,
  assertCanCancel,
  assertCanConfirm,
  assertCanReserve,
  assertCanUpdate,
  computeStatusAfterReserve,
  normalizeRentalOrderProps,
  validateRentalOrderItems,
  validateRentalPeriod,
} from "./rental-order.rules";
import type {
  CreateRentalOrderData,
  RentalOrderItemProps,
  RentalOrderProps,
  ReserveRentalOrderItemData,
} from "./rental-order.types";

export class RentalOrder implements Entity<RentalOrderId> {
  readonly id: RentalOrderId;
  readonly orderNumber: string;
  readonly customerId: RentalOrderProps["customerId"];
  readonly warehouseId: RentalOrderProps["warehouseId"];
  readonly status: RentalOrderStatus;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly remarks: string | null;
  readonly items: RentalOrderItemProps[];
  readonly createdById: RentalOrderProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: RentalOrderProps) {
    const normalized = normalizeRentalOrderProps(props);

    this.id = normalized.id;
    this.orderNumber = normalized.orderNumber;
    this.customerId = normalized.customerId;
    this.warehouseId = normalized.warehouseId;
    this.status = normalized.status;
    this.startDate = normalized.startDate;
    this.endDate = normalized.endDate;
    this.remarks = normalized.remarks;
    this.items = normalized.items;
    this.createdById = normalized.createdById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateRentalOrderData,
  ): Omit<RentalOrderProps, "id" | "status" | "createdAt" | "updatedAt"> {
    validateRentalPeriod(data.startDate, data.endDate);

    return {
      orderNumber: createOrderNumber(data.orderNumber),
      customerId: data.customerId,
      warehouseId: data.warehouseId,
      startDate: data.startDate,
      endDate: data.endDate,
      remarks: normalizeOptionalText(data.remarks),
      items: validateRentalOrderItems(data.items),
      createdById: data.createdById,
    };
  }

  static reconstitute(props: RentalOrderProps): RentalOrder {
    return new RentalOrder(props);
  }

  toProps(): RentalOrderProps {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      warehouseId: this.warehouseId,
      status: this.status,
      startDate: this.startDate,
      endDate: this.endDate,
      remarks: this.remarks,
      items: this.items.map((item) => ({ ...item })),
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withConfirmed(): RentalOrder {
    assertCanConfirm(this.status);

    return RentalOrder.reconstitute({
      ...this.toProps(),
      status: "CONFIRMED",
      updatedAt: new Date(),
    });
  }

  withCancelled(): RentalOrder {
    assertCanCancel(this.status, this.items);

    return RentalOrder.reconstitute({
      ...this.toProps(),
      status: "CANCELLED",
      updatedAt: new Date(),
    });
  }

  withReserved(reserveItems: ReserveRentalOrderItemData[]): RentalOrder {
    assertCanReserve(this.status);

    const updatedItems = applyReserveToItems(this.items, reserveItems);

    return RentalOrder.reconstitute({
      ...this.toProps(),
      status: computeStatusAfterReserve(updatedItems),
      items: updatedItems,
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
