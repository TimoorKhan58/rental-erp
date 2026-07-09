import type { PurchaseOrderDto } from "@/modules/procurement/application/dtos/purchase-order.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface PurchaseOrderItemResponse {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export interface PurchaseOrderResponse {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseOrderDto["status"];
  orderDate: string;
  expectedDate: string | null;
  remarks: string | null;
  items: PurchaseOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrderResponse[];
  meta: PaginationMeta;
}

export function toPurchaseOrderResponse(
  dto: PurchaseOrderDto,
): PurchaseOrderResponse {
  return {
    id: dto.id,
    poNumber: dto.poNumber,
    supplierId: dto.supplierId,
    warehouseId: dto.warehouseId,
    status: dto.status,
    orderDate: dto.orderDate,
    expectedDate: dto.expectedDate,
    remarks: dto.remarks,
    items: dto.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      receivedQuantity: item.receivedQuantity,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toPurchaseOrderListResponse(
  result: PaginatedResult<PurchaseOrderDto>,
): PurchaseOrderListResponse {
  return {
    items: result.items.map(toPurchaseOrderResponse),
    meta: result.meta,
  };
}
