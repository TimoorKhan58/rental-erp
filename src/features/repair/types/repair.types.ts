import type { PaginationMeta } from "@/types/api";

export const REPAIR_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export type RepairResponse = {
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
};

export type RepairListResponse = {
  items: RepairResponse[];
  meta: PaginationMeta;
};

export type RepairSortField =
  | "repairNumber"
  | "repairDate"
  | "status"
  | "createdAt";

export type ListRepairsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: RepairSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: RepairStatus;
  returnId?: string;
  productId?: string;
  warehouseId?: string;
};

export type CreateRepairPayload = {
  repairNumber: string;
  returnId: string;
  returnItemId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  repairCost: number;
  repairDate: string;
  repairNotes?: string | null;
  technician?: string | null;
};

export type UpdateRepairPayload = {
  repairCost?: number;
  repairNotes?: string | null;
  technician?: string | null;
  repairDate?: string;
  quantity?: number;
};
