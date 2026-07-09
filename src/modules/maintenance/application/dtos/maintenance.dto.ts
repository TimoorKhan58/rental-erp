import type { MaintenanceStatus, MaintenanceServiceType } from "@/modules/maintenance/domain";

export interface MaintenanceDto {
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
}

export interface CreateMaintenanceDto {
  maintenanceNumber: string;
  productId: string;
  warehouseId: string;
  inventoryId: string;
  quantity: number;
  serviceType: MaintenanceServiceType;
  technician?: string | null;
  vendor?: string | null;
  scheduledDate: string;
  estimatedCost: number;
  actualCost?: number;
  notes?: string | null;
}

export interface UpdateMaintenanceDto {
  quantity?: number;
  serviceType?: MaintenanceServiceType;
  technician?: string | null;
  vendor?: string | null;
  scheduledDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string | null;
}

export interface MaintenanceIdParamDto {
  id: string;
}
