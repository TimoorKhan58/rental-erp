import type { MaintenanceId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Maintenance } from "./maintenance.entity";
import type { MaintenanceListQuery } from "./maintenance-list.query";
import type {
  CreateMaintenanceData,
  UpdateMaintenanceData,
  UpdateMaintenanceStatusData,
} from "./maintenance.types";

export interface IMaintenanceRepository {
  findById(id: MaintenanceId): Promise<Maintenance | null>;
  findByMaintenanceNumber(
    maintenanceNumber: string,
  ): Promise<Maintenance | null>;
  findPaged(query: MaintenanceListQuery): Promise<PaginatedResult<Maintenance>>;
  create(data: CreateMaintenanceData): Promise<Maintenance>;
  update(id: MaintenanceId, data: UpdateMaintenanceData): Promise<Maintenance>;
  updateStatus(
    id: MaintenanceId,
    data: UpdateMaintenanceStatusData,
  ): Promise<Maintenance>;
}
