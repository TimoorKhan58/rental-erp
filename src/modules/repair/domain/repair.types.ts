import type {
  ProductId,
  RepairId,
  ReturnInspectionId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { RepairStatus } from "./repair.constants";

export interface RepairProps {
  id: RepairId;
  repairNumber: string;
  returnId: ReturnInspectionId;
  returnItemId: string;
  productId: ProductId;
  warehouseId: WarehouseId;
  quantity: number;
  repairCost: number;
  repairNotes: string | null;
  technician: string | null;
  repairDate: Date;
  status: RepairStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRepairData {
  repairNumber: string;
  returnId: ReturnInspectionId;
  returnItemId: string;
  productId: ProductId;
  warehouseId: WarehouseId;
  quantity: number;
  repairCost: number;
  repairNotes?: string | null;
  technician?: string | null;
  repairDate: Date;
  createdById: UserId;
}

export interface UpdateRepairData {
  repairCost?: number;
  repairNotes?: string | null;
  technician?: string | null;
  repairDate?: Date;
  quantity?: number;
}

export interface UpdateRepairStatusData {
  status: RepairStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
}
