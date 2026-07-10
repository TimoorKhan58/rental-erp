import type { BrandDto } from "@/modules/catalog/application/dtos/brand.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface BrandResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandListResponse {
  items: BrandResponse[];
  meta: PaginationMeta;
}

export function toBrandResponse(dto: BrandDto): BrandResponse {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toBrandListResponse(
  result: PaginatedResult<BrandDto>,
): BrandListResponse {
  return {
    items: result.items.map(toBrandResponse),
    meta: result.meta,
  };
}
