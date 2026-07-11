import type { PaginationMeta } from "@/types/api";

export const MAINTENANCE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_SERVICE_TYPES = [
  "PREVENTIVE",
  "CLEANING",
  "INSPECTION",
  "CALIBRATION",
  "LUBRICATION",
  "OTHER",
] as const;

export type MaintenanceServiceType = (typeof MAINTENANCE_SERVICE_TYPES)[number];

export type MaintenanceResponse = {
  id: string;
  maintenanceNumber: string;
  productId: string;
  warehouseId: string;
  inventoryId: string;
  quantity: number;
  serviceType: MaintenanceServiceType;
  technician: string | null;
  vendor: string | null;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedCost: number;
  actualCost: number;
  notes: string | null;
  status: MaintenanceStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceListResponse = {
  items: MaintenanceResponse[];
  meta: PaginationMeta;
};

export type MaintenanceSortField =
  | "maintenanceNumber"
  | "scheduledDate"
  | "status"
  | "createdAt";

export type ListMaintenancesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: MaintenanceSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: MaintenanceStatus;
  productId?: string;
  warehouseId?: string;
  inventoryId?: string;
};

export type CreateMaintenancePayload = {
  maintenanceNumber: string;
  productId: string;
  warehouseId: string;
  inventoryId: string;
  quantity: number;
  serviceType: MaintenanceServiceType;
  scheduledDate: string;
  estimatedCost: number;
  technician?: string | null;
  vendor?: string | null;
  actualCost?: number;
  notes?: string | null;
};

export type UpdateMaintenancePayload = {
  quantity?: number;
  serviceType?: MaintenanceServiceType;
  technician?: string | null;
  vendor?: string | null;
  scheduledDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string | null;
};
