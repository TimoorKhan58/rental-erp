import type { AttributeDto } from "@/modules/catalog/application/dtos/attribute.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface AttributeResponse {
  id: string;
  name: string;
  dataType: import("@/modules/catalog/domain").AttributeDataType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeListResponse {
  items: AttributeResponse[];
  meta: PaginationMeta;
}

export function toAttributeResponse(dto: AttributeDto): AttributeResponse {
  return {
    id: dto.id,
    name: dto.name,
    dataType: dto.dataType,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toAttributeListResponse(
  result: PaginatedResult<AttributeDto>,
): AttributeListResponse {
  return {
    items: result.items.map(toAttributeResponse),
    meta: result.meta,
  };
}
