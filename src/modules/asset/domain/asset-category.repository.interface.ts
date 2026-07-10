import type { AssetCategoryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AssetCategory } from "./asset-category.entity";
import type { AssetCategoryListQuery } from "./asset-category-list.query";
import type {
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
} from "./asset-category.types";

export interface IAssetCategoryRepository {
  findById(id: AssetCategoryId): Promise<AssetCategory | null>;
  findByName(name: string): Promise<AssetCategory | null>;
  findPaged(
    query: AssetCategoryListQuery,
  ): Promise<PaginatedResult<AssetCategory>>;
  exists(id: AssetCategoryId): Promise<boolean>;
  create(data: CreateAssetCategoryData): Promise<AssetCategory>;
  update(
    id: AssetCategoryId,
    data: UpdateAssetCategoryData,
  ): Promise<AssetCategory>;
  delete(id: AssetCategoryId): Promise<void>;
}
