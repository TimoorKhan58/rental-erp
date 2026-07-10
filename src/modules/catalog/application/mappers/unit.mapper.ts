import type { Unit } from "@/modules/catalog/domain/unit.entity";
import type { UnitListQuery } from "@/modules/catalog/domain/unit-list.query";
import type {
  CreateUnitData,
  UpdateUnitData,
} from "@/modules/catalog/domain/unit.types";
import type { UnitOfMeasureId } from "@/shared/domain/ids";

import type { UnitDto } from "../dtos/unit.dto";
import type {
  CreateUnitInput,
  UpdateUnitInput,
} from "../schemas/unit.schemas";
import type { ListUnitsInput } from "../schemas/list-units.schema";

export function toUnitId(id: string): UnitOfMeasureId {
  return id as UnitOfMeasureId;
}

export function toUnitDto(
  entity: Unit,
): UnitDto {
  const props = entity.toProps();

  return {
    id: props.id,
    code: props.code,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateUnitData(
  input: CreateUnitInput,
): CreateUnitData {
  return {
    code: input.code,
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toUpdateUnitData(
  input: UpdateUnitInput,
): UpdateUnitData {
  return {
    code: input.code,
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  };
}

export function toUnitListQuery(
  input: ListUnitsInput,
): UnitListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
