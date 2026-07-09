import type { ReturnStatus } from "@/modules/return/domain";

export interface ReturnItemDto {
  id: string;
  rentalOrderItemId: string;
  dispatchItemId: string | null;
  returnedQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  notes: string | null;
}

export interface ReturnDto {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  returnDate: string;
  remarks: string | null;
  status: ReturnStatus;
  receivedAt: string | null;
  inspectedAt: string | null;
  completedAt: string | null;
  items: ReturnItemDto[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnItemDto {
  rentalOrderItemId: string;
  dispatchItemId?: string | null;
  quantity: number;
  notes?: string | null;
}

export interface CreateReturnDto {
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  returnDate: string;
  remarks?: string | null;
  items: CreateReturnItemDto[];
}

export interface UpdateReturnDto {
  returnDate?: string;
  remarks?: string | null;
  items?: CreateReturnItemDto[];
}

export interface InspectReturnItemDto {
  rentalOrderItemId: string;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  notes?: string | null;
}

export interface InspectReturnDto {
  items: InspectReturnItemDto[];
}

export interface ReturnIdParamDto {
  id: string;
}
