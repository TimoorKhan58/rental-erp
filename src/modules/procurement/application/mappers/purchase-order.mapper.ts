import type { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import type {
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
} from "@/modules/procurement/domain/purchase-order.types";
import type {
  ProductId,
  PurchaseOrderId,
  SupplierId,
  WarehouseId,
} from "@/shared/domain/ids";

import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from "../schemas/purchase-order.schemas";
import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";

export function toPurchaseOrderDto(order: PurchaseOrder): PurchaseOrderDto {
  const props = order.toProps();

  return {
    id: props.id,
    poNumber: props.poNumber,
    supplierId: props.supplierId,
    warehouseId: props.warehouseId,
    status: props.status,
    orderDate: props.orderDate.toISOString(),
    expectedDate: props.expectedDate?.toISOString() ?? null,
    remarks: props.remarks,
    items: props.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      receivedQuantity: item.receivedQuantity,
    })),
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreatePurchaseOrderData(
  input: CreatePurchaseOrderInput,
): CreatePurchaseOrderData {
  return {
    poNumber: input.poNumber,
    supplierId: input.supplierId as SupplierId,
    warehouseId: input.warehouseId as WarehouseId,
    orderDate: input.orderDate,
    expectedDate: input.expectedDate ?? null,
    remarks: input.remarks ?? null,
    items: input.items.map((item) => ({
      productId: item.productId as ProductId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  };
}

export function toUpdatePurchaseOrderData(
  input: UpdatePurchaseOrderInput,
): UpdatePurchaseOrderData {
  return {
    supplierId: input.supplierId as SupplierId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
    orderDate: input.orderDate,
    expectedDate: input.expectedDate,
    remarks: input.remarks,
    items: input.items?.map((item) => ({
      productId: item.productId as ProductId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  };
}

export function toPurchaseOrderId(id: string): PurchaseOrderId {
  return id as PurchaseOrderId;
}

export function toProductId(id: string): ProductId {
  return id as ProductId;
}
