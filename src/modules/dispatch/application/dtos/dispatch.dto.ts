import type { DeliveryMethod, DispatchStatus } from "@/modules/dispatch/domain";

export interface DispatchItemDto {
  id: string;
  productId: string;
  rentalOrderItemId: string | null;
  quantity: number;
  notes: string | null;
}

export interface DispatchDto {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  dispatchDate: string;
  deliveryMethod: DeliveryMethod;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  deliveryAddress: string;
  remarks: string | null;
  status: DispatchStatus;
  readyAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  items: DispatchItemDto[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDispatchItemDto {
  productId: string;
  rentalOrderItemId?: string | null;
  quantity: number;
  notes?: string | null;
}

export interface CreateDispatchDto {
  dispatchNumber: string;
  rentalOrderId: string;
  dispatchDate: string;
  deliveryMethod: DeliveryMethod;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryAddress: string;
  remarks?: string | null;
  items: CreateDispatchItemDto[];
}

export interface UpdateDispatchDto {
  dispatchDate?: string;
  deliveryMethod?: DeliveryMethod;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryAddress?: string;
  remarks?: string | null;
  items?: CreateDispatchItemDto[];
  markReady?: boolean;
}

export interface DispatchIdParamDto {
  id: string;
}
