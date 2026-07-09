import type {
  ProductId,
  PurchaseOrderId,
  SupplierId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { PurchaseOrderStatus } from "./purchase-order.constants";

export interface PurchaseOrderItemProps {
  id: string;
  productId: ProductId;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export interface CreatePurchaseOrderItemData {
  productId: ProductId;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderData {
  poNumber: string;
  supplierId: SupplierId;
  warehouseId: WarehouseId;
  orderDate: Date;
  expectedDate: Date | null;
  remarks: string | null;
  items: CreatePurchaseOrderItemData[];
}

export interface UpdatePurchaseOrderData {
  supplierId?: SupplierId;
  warehouseId?: WarehouseId;
  orderDate?: Date;
  expectedDate?: Date | null;
  remarks?: string | null;
  items?: CreatePurchaseOrderItemData[];
}

export interface ReceivePurchaseOrderItemData {
  productId: ProductId;
  quantity: number;
}

export interface UpdatePurchaseOrderReceiveData {
  status: PurchaseOrderStatus;
  items: Array<{
    id: string;
    receivedQuantity: number;
  }>;
}

export interface PurchaseOrderProps {
  id: PurchaseOrderId;
  poNumber: string;
  supplierId: SupplierId;
  warehouseId: WarehouseId;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDate: Date | null;
  remarks: string | null;
  items: PurchaseOrderItemProps[];
  createdAt: Date;
  updatedAt: Date;
}
