import type { PurchaseOrderId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { PurchaseOrderStatus } from "./purchase-order.constants";
import {
  PurchaseOrderInvalidStatusError,
  createPoNumber,
} from "./purchase-order.errors";
import {
  applyReceiveToItems,
  assertCanApprove,
  assertCanCancel,
  assertCanReceive,
  assertCanUpdate,
  computeStatusAfterReceive,
  normalizePurchaseOrderProps,
  validatePurchaseOrderItems,
} from "./purchase-order.rules";
import type {
  CreatePurchaseOrderData,
  PurchaseOrderItemProps,
  PurchaseOrderProps,
  ReceivePurchaseOrderItemData,
} from "./purchase-order.types";

export class PurchaseOrder implements Entity<PurchaseOrderId> {
  readonly id: PurchaseOrderId;
  readonly poNumber: string;
  readonly supplierId: PurchaseOrderProps["supplierId"];
  readonly warehouseId: PurchaseOrderProps["warehouseId"];
  readonly status: PurchaseOrderStatus;
  readonly orderDate: Date;
  readonly expectedDate: Date | null;
  readonly remarks: string | null;
  readonly items: PurchaseOrderItemProps[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: PurchaseOrderProps) {
    const normalized = normalizePurchaseOrderProps(props);

    this.id = normalized.id;
    this.poNumber = normalized.poNumber;
    this.supplierId = normalized.supplierId;
    this.warehouseId = normalized.warehouseId;
    this.status = normalized.status;
    this.orderDate = normalized.orderDate;
    this.expectedDate = normalized.expectedDate;
    this.remarks = normalized.remarks;
    this.items = normalized.items;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreatePurchaseOrderData,
  ): Omit<PurchaseOrderProps, "id" | "status" | "createdAt" | "updatedAt"> {
    return {
      poNumber: createPoNumber(data.poNumber),
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      orderDate: data.orderDate,
      expectedDate: data.expectedDate,
      remarks: normalizeOptionalText(data.remarks),
      items: validatePurchaseOrderItems(data.items),
    };
  }

  static reconstitute(props: PurchaseOrderProps): PurchaseOrder {
    return new PurchaseOrder(props);
  }

  toProps(): PurchaseOrderProps {
    return {
      id: this.id,
      poNumber: this.poNumber,
      supplierId: this.supplierId,
      warehouseId: this.warehouseId,
      status: this.status,
      orderDate: this.orderDate,
      expectedDate: this.expectedDate,
      remarks: this.remarks,
      items: this.items.map((item) => ({ ...item })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withApproved(): PurchaseOrder {
    assertCanApprove(this.status);

    return PurchaseOrder.reconstitute({
      ...this.toProps(),
      status: "APPROVED",
      updatedAt: new Date(),
    });
  }

  withCancelled(): PurchaseOrder {
    assertCanCancel(this.status, this.items);

    return PurchaseOrder.reconstitute({
      ...this.toProps(),
      status: "CANCELLED",
      updatedAt: new Date(),
    });
  }

  withReceived(receiveItems: ReceivePurchaseOrderItemData[]): PurchaseOrder {
    assertCanReceive(this.status);

    const updatedItems = applyReceiveToItems(this.items, receiveItems);
    const hasReceive = receiveItems.some((receiveItem) =>
      this.items.some((item) => item.productId === receiveItem.productId),
    );

    if (!hasReceive) {
      throw new PurchaseOrderInvalidStatusError(this.status, "receive");
    }

    const totalReceivedDelta = receiveItems.reduce(
      (sum, receiveItem) => sum + receiveItem.quantity,
      0,
    );

    if (totalReceivedDelta <= 0) {
      throw new PurchaseOrderInvalidStatusError(this.status, "receive");
    }

    return PurchaseOrder.reconstitute({
      ...this.toProps(),
      status: computeStatusAfterReceive(updatedItems),
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
