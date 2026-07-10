import type { UnitDto } from "@/modules/catalog/application/dtos/unit.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface UnitResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitListResponse {
  items: UnitResponse[];
  meta: PaginationMeta;
}

export function toUnitResponse(dto: UnitDto): UnitResponse {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toUnitListResponse(
  result: PaginatedResult<UnitDto>,
): UnitListResponse {
  return {
    items: result.items.map(toUnitResponse),
    meta: result.meta,
  };
}
