import type {
  DispatchId,
  ProductId,
  RentalOrderId,
  UserId,
} from "@/shared/domain/ids";

import type { DeliveryMethod, DispatchStatus } from "./dispatch.constants";

export interface DispatchItemProps {
  id: string;
  productId: ProductId;
  rentalOrderItemId: string | null;
  quantity: number;
  notes: string | null;
}

export interface DispatchProps {
  id: DispatchId;
  dispatchNumber: string;
  rentalOrderId: RentalOrderId;
  dispatchDate: Date;
  deliveryMethod: DeliveryMethod;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  deliveryAddress: string;
  remarks: string | null;
  status: DispatchStatus;
  readyAt: Date | null;
  dispatchedAt: Date | null;
  completedAt: Date | null;
  items: DispatchItemProps[];
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDispatchItemData {
  productId: ProductId;
  rentalOrderItemId?: string | null;
  quantity: number;
  notes?: string | null;
}

export interface CreateDispatchData {
  dispatchNumber: string;
  rentalOrderId: RentalOrderId;
  dispatchDate: Date;
  deliveryMethod: DeliveryMethod;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryAddress: string;
  remarks?: string | null;
  items: CreateDispatchItemData[];
  createdById: UserId;
}

export interface UpdateDispatchData {
  dispatchDate?: Date;
  deliveryMethod?: DeliveryMethod;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryAddress?: string;
  remarks?: string | null;
  items?: CreateDispatchItemData[];
  markReady?: boolean;
}
