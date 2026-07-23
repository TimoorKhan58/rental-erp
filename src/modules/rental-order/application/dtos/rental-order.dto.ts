import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";

export interface RentalOrderItemDto {
  id: string;
  productId: string;
  quantity: number;
  dailyRate: number;
  reservedQuantity: number;
  startDate: string;
  endDate: string;
  numberOfDays: number;
}

export interface RentalOrderDto {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: RentalOrderStatus;
  startDate: string;
  endDate: string;
  remarks: string | null;
  items: RentalOrderItemDto[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalOrderIdParamDto {
  id: string;
}

export interface CreateRentalOrderItemDto {
  productId: string;
  quantity: number;
  dailyRate: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateRentalOrderDto {
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  startDate: string;
  endDate: string;
  remarks?: string | null;
  items: CreateRentalOrderItemDto[];
}

export interface UpdateRentalOrderDto {
  customerId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  remarks?: string | null;
  items?: CreateRentalOrderItemDto[];
}

export interface ReserveRentalOrderItemDto {
  productId: string;
  quantity: number;
}

export interface ReserveRentalOrderDto {
  items: ReserveRentalOrderItemDto[];
}
