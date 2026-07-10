import type { CategoryDto } from "@/modules/catalog/application/dtos/category.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface CategoryResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListResponse {
  items: CategoryResponse[];
  meta: PaginationMeta;
}

export function toCategoryResponse(dto: CategoryDto): CategoryResponse {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toCategoryListResponse(
  result: PaginatedResult<CategoryDto>,
): CategoryListResponse {
  return {
    items: result.items.map(toCategoryResponse),
    meta: result.meta,
  };
}
