import type { UnitOfMeasureId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Unit } from "./unit.entity";
import type { UnitListQuery } from "./unit-list.query";
import type { CreateUnitData, UpdateUnitData } from "./unit.types";

export interface IUnitRepository {
  findById(id: UnitOfMeasureId): Promise<Unit | null>;
  findByCode(code: string): Promise<Unit | null>;
  findByName(name: string): Promise<Unit | null>;
  findPaged(query: UnitListQuery): Promise<PaginatedResult<Unit>>;
  exists(id: UnitOfMeasureId): Promise<boolean>;
  create(data: CreateUnitData): Promise<Unit>;
  update(id: UnitOfMeasureId, data: UpdateUnitData): Promise<Unit>;
  delete(id: UnitOfMeasureId): Promise<void>;
}
