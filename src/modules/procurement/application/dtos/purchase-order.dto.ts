import type { PurchaseOrderStatus } from "@/modules/procurement/domain/purchase-order.constants";

export interface PurchaseOrderItemDto {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  remarks: string | null;
  items: PurchaseOrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderIdParamDto {
  id: string;
}

export interface CreatePurchaseOrderItemDto {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderDto {
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate?: string | null;
  remarks?: string | null;
  items: CreatePurchaseOrderItemDto[];
}

export interface UpdatePurchaseOrderDto {
  supplierId?: string;
  warehouseId?: string;
  orderDate?: string;
  expectedDate?: string | null;
  remarks?: string | null;
  items?: CreatePurchaseOrderItemDto[];
}

export interface ReceivePurchaseOrderItemDto {
  productId: string;
  quantity: number;
}

export interface ReceivePurchaseOrderDto {
  items: ReceivePurchaseOrderItemDto[];
}
