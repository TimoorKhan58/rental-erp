import type { AssetCategoryDto } from "@/modules/asset/application/dtos/asset-category.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface AssetCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCategoryListResponse {
  items: AssetCategoryResponse[];
  meta: PaginationMeta;
}

export function toAssetCategoryResponse(
  dto: AssetCategoryDto,
): AssetCategoryResponse {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toAssetCategoryListResponse(
  result: PaginatedResult<AssetCategoryDto>,
): AssetCategoryListResponse {
  return {
    items: result.items.map(toAssetCategoryResponse),
    meta: result.meta,
  };
}
