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
}
