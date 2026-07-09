import type {
  CustomerId,
  ProductId,
  RentalOrderId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { RentalOrderStatus } from "./rental-order.constants";

export interface RentalOrderItemProps {
  id: string;
  productId: ProductId;
  quantity: number;
  dailyRate: number;
  reservedQuantity: number;
}

export interface CreateRentalOrderItemData {
  productId: ProductId;
  quantity: number;
  dailyRate: number;
}

export interface CreateRentalOrderData {
  orderNumber: string;
  customerId: CustomerId;
  warehouseId: WarehouseId;
  startDate: Date;
  endDate: Date;
  remarks: string | null;
  items: CreateRentalOrderItemData[];
  createdById: UserId;
}

export interface UpdateRentalOrderData {
  customerId?: CustomerId;
  warehouseId?: WarehouseId;
  startDate?: Date;
  endDate?: Date;
  remarks?: string | null;
  items?: CreateRentalOrderItemData[];
}

export interface ReserveRentalOrderItemData {
  productId: ProductId;
  quantity: number;
}

export interface UpdateRentalOrderReserveData {
  status: RentalOrderStatus;
  items: Array<{
    id: string;
    reservedQuantity: number;
  }>;
}

export interface RentalOrderProps {
  id: RentalOrderId;
  orderNumber: string;
  customerId: CustomerId;
  warehouseId: WarehouseId;
  status: RentalOrderStatus;
  startDate: Date;
  endDate: Date;
  remarks: string | null;
  items: RentalOrderItemProps[];
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
}
