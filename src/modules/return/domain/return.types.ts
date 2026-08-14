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
  /** Null = legacy owned-only return. */
  ownedQuantity: number | null;
  externalQuantity: number | null;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  missingQuantity: number;
  /** Phase 28.1 — source × condition (0 = unset / legacy). */
  ownedGoodQuantity: number;
  ownedDamagedQuantity: number;
  ownedLostQuantity: number;
  externalGoodQuantity: number;
  externalDamagedQuantity: number;
  externalLostQuantity: number;
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
  ownedQuantity?: number | null;
  externalQuantity?: number | null;
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
  missingQuantity: number;
  ownedGoodQuantity?: number;
  ownedDamagedQuantity?: number;
  ownedLostQuantity?: number;
  externalGoodQuantity?: number;
  externalDamagedQuantity?: number;
  externalLostQuantity?: number;
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
