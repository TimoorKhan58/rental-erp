import type { RepairStatus } from "@/modules/repair/domain";

export interface RepairDto {
  id: string;
  repairNumber: string;
  returnId: string;
  returnItemId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  repairCost: number;
  repairNotes: string | null;
  technician: string | null;
  repairDate: string;
  status: RepairStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepairDto {
  repairNumber: string;
  returnId: string;
  returnItemId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  repairCost: number;
  repairNotes?: string | null;
  technician?: string | null;
  repairDate: string;
}

export interface UpdateRepairDto {
  repairCost?: number;
  repairNotes?: string | null;
  technician?: string | null;
  repairDate?: string;
  quantity?: number;
}

export interface RepairIdParamDto {
  id: string;
}
