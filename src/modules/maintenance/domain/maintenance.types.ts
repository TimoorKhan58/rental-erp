import type {
  InventoryId,
  MaintenanceId,
  ProductId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type {
  MaintenanceServiceType,
  MaintenanceStatus,
} from "./maintenance.constants";

export interface MaintenanceProps {
  id: MaintenanceId;
  maintenanceNumber: string;
  productId: ProductId;
  warehouseId: WarehouseId;
  inventoryId: InventoryId;
  quantity: number;
  serviceType: MaintenanceServiceType;
  technician: string | null;
  vendor: string | null;
  scheduledDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCost: number;
  actualCost: number;
  notes: string | null;
  status: MaintenanceStatus;
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaintenanceData {
  maintenanceNumber: string;
  productId: ProductId;
  warehouseId: WarehouseId;
  inventoryId: InventoryId;
  quantity: number;
  serviceType: MaintenanceServiceType;
  technician?: string | null;
  vendor?: string | null;
  scheduledDate: Date;
  estimatedCost: number;
  actualCost?: number;
  notes?: string | null;
  createdById: UserId;
}

export interface UpdateMaintenanceData {
  quantity?: number;
  serviceType?: MaintenanceServiceType;
  technician?: string | null;
  vendor?: string | null;
  scheduledDate?: Date;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string | null;
}

export interface UpdateMaintenanceStatusData {
  status: MaintenanceStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
}
