import type {
  DispatchId,
  RentalOrderId,
  ReturnInspectionId,
  UserId,
} from "@/shared/domain/ids";

import type { ReturnStatus } from "./return.constants";

export interface ReturnItemProps {
  id: string;
  rentalOrderItemId: string;
  dispatchItemId: string | null;
  returnedQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  notes: string | null;
}

export interface ReturnProps {
  id: ReturnInspectionId;
  returnNumber: string;
  rentalOrderId: RentalOrderId;
  dispatchId: DispatchId;
  returnDate: Date;
  remarks: string | null;
  status: ReturnStatus;
  receivedAt: Date | null;
  inspectedAt: Date | null;
  completedAt: Date | null;
  items: ReturnItemProps[];
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReturnItemData {
  rentalOrderItemId: string;
  dispatchItemId?: string | null;
  quantity: number;
  notes?: string | null;
}

export interface CreateReturnData {
  returnNumber: string;
  rentalOrderId: RentalOrderId;
  dispatchId: DispatchId;
  returnDate: Date;
  remarks?: string | null;
  items: CreateReturnItemData[];
  createdById: UserId;
}

export interface UpdateReturnData {
  returnDate?: Date;
  remarks?: string | null;
  items?: CreateReturnItemData[];
}

export interface InspectReturnItemData {
  rentalOrderItemId: string;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  notes?: string | null;
}

export interface UpdateReturnInspectData {
  items: InspectReturnItemData[];
}

export interface UpdateReturnStatusData {
  status: ReturnStatus;
  receivedAt?: Date | null;
  inspectedAt?: Date | null;
  completedAt?: Date | null;
  items?: ReturnItemProps[];
}
