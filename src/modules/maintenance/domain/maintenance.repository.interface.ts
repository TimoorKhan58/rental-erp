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
  /**
   * Phase 33 (F-30-07): atomically claims a status transition using an
   * expected-status predicate. Returns the updated maintenance on success,
   * or null when zero rows match. Callers translate null into
   * ConcurrentUpdateError (HTTP 409) before any stock side effects.
   */
  claimStatusTransition(
    id: MaintenanceId,
    expected: Maintenance["status"] | ReadonlyArray<Maintenance["status"]>,
    data: UpdateMaintenanceStatusData,
  ): Promise<Maintenance | null>;
}
