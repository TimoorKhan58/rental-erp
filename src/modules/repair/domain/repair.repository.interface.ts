import type { RepairId, ReturnInspectionId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Repair } from "./repair.entity";
import type { RepairListQuery } from "./repair-list.query";
import type {
  CreateRepairData,
  UpdateRepairData,
  UpdateRepairStatusData,
} from "./repair.types";

export interface IRepairRepository {
  findById(id: RepairId): Promise<Repair | null>;
  findByRepairNumber(repairNumber: string): Promise<Repair | null>;
  findByReturnId(returnId: ReturnInspectionId): Promise<Repair[]>;
  findPaged(query: RepairListQuery): Promise<PaginatedResult<Repair>>;
  create(data: CreateRepairData): Promise<Repair>;
  update(id: RepairId, data: UpdateRepairData): Promise<Repair>;
  updateStatus(id: RepairId, data: UpdateRepairStatusData): Promise<Repair>;
  /**
   * Phase 33 (F-30-07): atomically claims a status transition using an
   * expected-status predicate. Returns the updated repair on success,
   * or null when zero rows match. Callers translate null into
   * ConcurrentUpdateError (HTTP 409) before any stock side effects.
   */
  claimStatusTransition(
    id: RepairId,
    expected: Repair["status"] | ReadonlyArray<Repair["status"]>,
    data: UpdateRepairStatusData,
  ): Promise<Repair | null>;
}
