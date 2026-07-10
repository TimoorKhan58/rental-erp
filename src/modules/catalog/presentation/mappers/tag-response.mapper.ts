import type { TagDto } from "@/modules/catalog/application/dtos/tag.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface TagResponse {
  id: string;
  name: string;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TagListResponse {
  items: TagResponse[];
  meta: PaginationMeta;
}

export function toTagResponse(dto: TagDto): TagResponse {
  return {
    id: dto.id,
    name: dto.name,
    color: dto.color,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toTagListResponse(
  result: PaginatedResult<TagDto>,
): TagListResponse {
  return {
    items: result.items.map(toTagResponse),
    meta: result.meta,
  };
}
